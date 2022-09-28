import inspect
import re
import traceback
from functools import wraps
from typing import Literal, Optional
from uuid import uuid4 as uuid
from urllib.parse import urlparse

import yaml
import flask
import requests

from pydatafront.app import app

__supported_basic_types = ["int", "float", "str", "bool"]
__supported_types = __supported_basic_types + ["dict", "list"]
__supported_basic_types_dict = {
    "int": "integer",
    "float": "number",
    "str": "string",
    "bool": "boolean"
}
__decorated_functions_list = list()
__wrapper_enabled = False
__default_theme = {}
__themes = {}
__parsed_themes = {}

def enable_wrapper():
    global __wrapper_enabled
    if not __wrapper_enabled:
        __wrapper_enabled = True

        @app.get("/list")
        def __textea_export_func_list():
            return {
                "list": __decorated_functions_list,
            }


def get_mui_theme(theme, colors):
    mui_theme = {
        "components": {}
    }
    if colors:
        mui_theme.update({"palette": {}})
        for color in colors.keys():
            if color == "mode":
                mui_theme["palette"][color] = colors[color]
            elif isinstance(colors[color], str):
                mui_theme["palette"][color] = {"main": colors[color]}
            else:
                mui_theme["palette"][color] = colors[color]
    for widget_name in theme.keys():
        mui_theme["components"]["Mui" + widget_name[0].upper() + widget_name[1::]] \
            = {"defaultProps": theme[widget_name]}
    return mui_theme

def parse_theme(theme):
    type_names = []
    type_widget_dict = {}
    widget_style = {}
    custom_palette = {}
    if "types" in theme:
        for type_name in theme["types"]:
            widget_name = theme["types"][type_name]
            if "," in type_name:
                common_types_names = [name.strip() for name in type_name.split(",")]
                type_names += common_types_names
                for name in common_types_names:
                    type_widget_dict[name] = widget_name
            else:
                type_names.append(type_name)
                type_widget_dict[type_name] = widget_name
    if "styles" in theme:
        for widget_name in theme["styles"].keys():
            widget_style[widget_name] = theme["styles"][widget_name]
    if "colors" in theme:
        for color_name in theme["colors"].keys():
            custom_palette[color_name] = theme["colors"][color_name]
    mui_theme = get_mui_theme(widget_style, custom_palette)
    return type_names, type_widget_dict, widget_style, custom_palette, mui_theme

def get_type_dict(annotation):
    if isinstance(annotation, object):  # is class
        annotation_type_class_name = getattr(type(annotation), "__name__")
        if annotation_type_class_name == "_GenericAlias":
            if getattr(annotation, "__module__") == "typing":
                if getattr(annotation, "_name") == "List" or getattr(annotation, "_name") == "Dict":
                    return {
                        "type": str(annotation)
                    }
                elif str(getattr(annotation, "__origin__")) == "typing.Literal":  # Python 3.8
                    literal_first_type = get_type_dict(type(getattr(annotation, "__args__")[0]))["type"]
                    return {
                        "type": literal_first_type,
                        "whitelist": getattr(annotation, "__args__")
                    }
                elif str(getattr(annotation, "__origin__")) == "typing.Union":  # typing.Optional
                    union_first_type = get_type_dict(getattr(annotation, "__args__")[0])["type"]
                    return {
                        "type": union_first_type,
                        "optional": True
                    }
                else:
                    raise Exception("Unsupported typing")
            else:
                raise Exception("Support typing only")
        elif annotation_type_class_name == "_LiteralGenericAlias":  # Python 3.10
            if str(getattr(annotation, "__origin__")) == "typing.Literal":
                literal_first_type = get_type_dict(type(getattr(annotation, "__args__")[0]))["type"]
                return {
                    "type": literal_first_type,
                    "whitelist": getattr(annotation, "__args__")
                }
            else:
                raise Exception("Unsupported annotation")
        elif annotation_type_class_name == "_SpecialGenericAlias":
            if getattr(annotation, "_name") == "Dict" or getattr(annotation, "_name") == "List":
                return {
                    "type": str(annotation)
                }
        elif annotation_type_class_name == "_TypedDictMeta":
            key_and_type = {}
            for key in annotation.__annotations__:
                key_and_type[key] = \
                    __supported_basic_types_dict[annotation.__annotations__[key].__name__] \
                        if annotation.__annotations__[key].__name__ in __supported_basic_types_dict \
                        else annotation.__annotations__[key].__name__
            return {
                "type": "typing.Dict",
                "keys": key_and_type
            }

        elif annotation_type_class_name == "type":
            return {
                "type": getattr(annotation, "__name__")
            }
        else:
            # raise Exception("Unsupported annotation_type_class_name")
            return {
                "type": "typing.Dict"
            }
    else:
        return {
            "type": str(annotation)
        }


def get_type_widget_prop(function_arg_type_name, index, function_arg_widget, widget_type):
    # Basic and List only
    if isinstance(function_arg_widget, str):
        widget = function_arg_widget
    elif isinstance(function_arg_widget, list):
        if index >= len(function_arg_widget):
            widget = ""
        else:
            widget = function_arg_widget[index]
    else:
        widget = ""
    if function_arg_type_name in widget_type:
        widget = widget_type[function_arg_type_name]
    if function_arg_type_name in __supported_basic_types:
        return {
            "type": __supported_basic_types_dict[function_arg_type_name],
            "widget": widget
        }
    elif function_arg_type_name == "list":
        return {
            "type": "array",
            "widget": widget
        }
    else:
        typing_list_search_result = re.search(
            "typing\.(?P<containerType>List)\[(?P<contentType>.*)]",
            function_arg_type_name)
        if isinstance(typing_list_search_result, re.Match):  # typing.List, typing.Dict
            content_type = typing_list_search_result.group("contentType")
            # (content_type in __supported_basic_types) for textea-sheet only
            return {
                "type": "array",
                "widget": widget,
                "items": get_type_widget_prop(content_type, index + 1, function_arg_widget)
            }
        elif function_arg_type_name == "typing.Dict":
            return {
                "type": "object",
                "widget": widget
            }
        elif function_arg_type_name == "typing.List":
            return {
                "type": "array",
                "widget": widget
            }
        else:
            # raise Exception("Unsupported Container Type")
            return {
                "type": "object",
                "widget": widget
            }


def is_valid_uri(uri: str) -> bool:
    try:
        result = urlparse(uri)
        return all([result.scheme, result.netloc, result.path])
    except:
        return False


def get_theme(path: str):
    if not path:
        return __default_theme
    if is_valid_uri(path):
        return yaml.load(requests.get(path).content, yaml.FullLoader)
    else:
        if path in __themes:
            return __themes[path]
        with open(path, "r", encoding = "utf-8") as f:
            return yaml.load(f.read(), yaml.FullLoader)


def set_global_theme(path: str) :
    global __default_theme, __parsed_themes
    __default_theme = get_theme(path)
    __parsed_themes["__default"] = parse_theme(__default_theme)


def import_theme(path: str, name: str):
    global __themes
    __themes[name] = get_theme(path)


def textea_export(path: Optional[str] = None, description: Optional[str] = "",
                  destination: Literal["column", "row", "sheet", None] = None, theme: Optional[str] = "",
                  **decorator_kwargs):
    global __parsed_themes
    def decorator(function: callable):
        if __wrapper_enabled:
            id: str = str(uuid())
            function_name = getattr(function, "__name__")  # function name as id to retrieve function info
            function_theme = get_theme(theme)

            if theme == "":
                parsed_theme = __parsed_themes["__default"]
            else:
                if theme in __parsed_themes:
                    parsed_theme = __parsed_themes[theme]
                else:
                    parsed_theme = parse_theme(function_theme)
                    __parsed_themes[theme] = parsed_theme

            if path is None:
                endpoint = function_name
            else:
                endpoint = path.strip("/")

            __decorated_functions_list.append({
                "name": function_name,
                "path": endpoint
            })

            function_signature = inspect.signature(function)
            function_params = function_signature.parameters
            decorated_params = dict()
            json_schema_props = dict()

            if function_signature.return_annotation is not inspect._empty:
                # return type dict enforcement for textea-sheet only
                try:
                    return_type_raw = getattr(function_signature.return_annotation, "__annotations__")
                    if getattr(type(return_type_raw), "__name__") == "dict":
                        return_type_parsed = dict()
                        for return_type_key, return_type_value in return_type_raw.items():
                            return_type_parsed[return_type_key] = str(return_type_value)
                    else:
                        return_type_parsed = str(return_type_raw)
                except:
                    return_type_parsed = get_type_dict(function_signature.return_annotation)["type"]
            else:
                return_type_parsed = None

            input_attr = ""
            for decorator_arg_name, decorator_arg_dict in decorator_kwargs.items():
                if decorator_arg_name not in decorated_params.keys():
                    decorated_params[decorator_arg_name] = dict()

                if decorator_arg_dict["treat_as"] == "config":
                    decorated_params[decorator_arg_name]["treat_as"] = "config"
                else:
                    decorated_params[decorator_arg_name]["treat_as"] = decorator_arg_dict["treat_as"]
                    input_attr = decorator_arg_dict["treat_as"] if input_attr == "" else input_attr
                    if input_attr != decorator_arg_dict["treat_as"]:
                        raise Exception("Error: input type doesn't match")

                if "widget" in decorator_arg_dict.keys():
                    decorated_params[decorator_arg_name]["widget"] = decorator_arg_dict["widget"]

                if "whitelist" in decorator_arg_dict.keys():
                    decorated_params[decorator_arg_name]["whitelist"] = decorator_arg_dict["whitelist"]
                elif "example" in decorator_arg_dict.keys():
                    decorated_params[decorator_arg_name]["example"] = decorator_arg_dict["example"]

            for _, function_param in function_params.items():
                function_arg_name = function_param.name
                if function_arg_name not in decorated_params.keys():
                    decorated_params[function_arg_name] = dict()  # default

                if "treat_as" not in decorated_params[function_arg_name].keys():
                    decorated_params[function_arg_name]["treat_as"] = "config"  # default
                function_arg_type_dict = get_type_dict(function_param.annotation)
                if function_arg_name not in decorated_params.keys():
                    decorated_params[function_arg_name] = dict()
                decorated_params[function_arg_name].update(function_arg_type_dict)

                default_example = function_param.default
                if default_example is not inspect.Parameter.empty:
                    if "example" in decorated_params[function_arg_name].keys():
                        decorated_params[function_arg_name].get("example").append(default_example)
                    else:
                        decorated_params[function_arg_name]["example"] = [
                            default_example
                        ]
                    decorated_params[function_arg_name]["default"] = default_example
                elif decorated_params[function_arg_name]["type"] == "bool":
                    decorated_params[function_arg_name]["default"] = False
                elif "optional" in decorated_params[function_arg_name].keys() and \
                        decorated_params[function_arg_name]["optional"]:
                    decorated_params[function_arg_name]["default"] = None

                if function_arg_name not in json_schema_props.keys():
                    json_schema_props[function_arg_name] = dict()
                if "widget" in decorated_params[function_arg_name].keys():
                    widget = decorated_params[function_arg_name]["widget"]
                else:
                    widget = ""
                json_schema_props[function_arg_name] = get_type_widget_prop(
                    function_arg_type_dict["type"],
                    0,
                    widget,
                    parsed_theme[1]
                )
                if "whitelist" in decorated_params[function_arg_name].keys():
                    json_schema_props[function_arg_name]["whitelist"] = decorated_params[function_arg_name]["whitelist"]
                elif "example" in decorated_params[function_arg_name].keys():
                    json_schema_props[function_arg_name]["example"] = decorated_params[function_arg_name]["example"]
                elif "keys" in decorated_params[function_arg_name].keys():
                    json_schema_props[function_arg_name]["keys"] = decorated_params[function_arg_name]["keys"]
                if "default" in decorated_params[function_arg_name].keys():
                    json_schema_props[function_arg_name]["default"] = decorated_params[function_arg_name]["default"]

                if decorated_params[function_arg_name]["treat_as"] == "cell":
                    if function_arg_type_dict["type"] in __supported_basic_types_dict:
                        cell_type = __supported_basic_types_dict[function_arg_type_dict["type"]]
                    else:
                        cell_type = "object"
                    json_schema_props[function_arg_name]["items"] = \
                        get_type_widget_prop(function_arg_type_dict["type"], 0, widget[1:])
                    json_schema_props[function_arg_name]["type"] = "array"

            decorated_function = {
                "id": id,
                "name": function_name,
                "params": decorated_params,
                "theme": parsed_theme[4],
                "return_type": return_type_parsed,
                "description": description,
                "schema": {
                    "title": function_name,
                    "description": description,
                    "type": "object",
                    "properties": json_schema_props
                },
                "destination": destination
            }

            get_wrapper = app.get("/param/{}".format(endpoint))

            def decorated_function_param_getter():
                return decorated_function

            decorated_function_param_getter.__setattr__("__name__", "{}_param_getter".format(function_name))
            get_wrapper(decorated_function_param_getter)

            @wraps(function)
            def wrapper():
                try:
                    function_kwargs = flask.request.get_json()

                    @wraps(function)
                    def wrapped_function(**wrapped_function_kwargs):
                        try:
                            result = function(**wrapped_function_kwargs)
                            if not isinstance(result, (str, dict, tuple)):
                                result = str(result)
                            return result
                        except:
                            return {
                                "error_type": "function",
                                "error_body": traceback.format_exc()
                            }

                    cell_names = []
                    for key in decorated_params.keys():
                        if decorated_params[key]["treat_as"] == "cell":
                            cell_names.append(key)
                    if len(cell_names) > 0:
                        length = len(function_kwargs[cell_names[0]])
                        static_keys = function_kwargs.keys() - cell_names
                        result = []
                        for i in range(length):
                            arg = {}
                            for cell_name in cell_names:
                                arg[cell_name] = function_kwargs[cell_name][i]
                            for static_key in static_keys:
                                arg[static_key] = function_kwargs[static_key]
                            result.append(wrapped_function(**arg))
                        return {"result": result}
                    else:
                        return wrapped_function(**function_kwargs)
                except:
                    return {
                        "error_type": "wrapper",
                        "error_body": traceback.format_exc()
                    }

            post_wrapper = app.post("/call/{}".format(id))
            post_wrapper(wrapper)
            wrapper._decorator_name_ = "textea_export"
        return function

    return decorator
