import random, os, typing
from typing import List, Optional, Tuple, Literal, Union

from matplotlib.figure import Figure
import matplotlib.pyplot as plt

from funix import funix, funix_yaml, funix_json5
from funix.hint import Image, File, Markdown, HTML, Code, Video, Audio

@funix(
        show_source=True
)
def hello(name: str="NCC-1701") -> str:
	return f"Hello, {name}."

@funix(
    title="Table, theme, and argument_config",
    description="""
### This example shows off multiple features of Funix. Click `Show source` to see the code.
* Per-argument customizations are aggregated in the `argument_config` parameter. 
* Parameter keys are tuples to configure multiple arguments altogether in a batch.
* This demo uses the [sunset](https://github.com/TexteaInc/funix/blob/main/examples/sunset_v2.yaml) theme.  For example, the widgets for integers are by default sliders, instead of input boxes.
* The resulting sheet's header is set in the return `dict`. The header is _Total_ if the operator is _add_, and _Difference_ if the operator is _minus_.

### Enjoy this demo
1. Select an opeartor, add or minus. 
2. Use the sliders to adjust the numbers in any cell. 
3. To add rows, click the `Add a Row` button. 
4. Click Submit to see the result.
5. In the Output panel, click the `Sheet` radio button to view the result as a headed table. 
    """,
    # theme = "https://raw.githubusercontent.com/TexteaInc/funix-doc/main/examples/sunset_v2.yaml",
    theme = "./sunset_v2.yaml",
    # FIXME: this themes makes the menu over the table dissapear.
    # Current workaround is to change the button to contained variant.
    # A proper fix should use an outlined button with a new prop in theme file to change the color in the text and the outline/border.
    widgets  = {
      ("a", "b", "c"): "sheet",
    },
    argument_config={
        "op": {
	        "argument_label": "Select an operation",
        },
        #FIXME: in argument_config, the key cannot be a tuple, like ("a", "b"): {"widget":"sheet", "treat_as":"column"}.
    }, 
    show_source=True
)
def calc(op: Literal["add", "minus"]="add", a: List[int]=[10,20], b: List[int]=[50,72], c: List[bool]=[True, False]) -> dict:
    if op == "add":
        return {"Total": [a[i] + b[i] for i in range(min(len(a), len(b)))]}
    elif op == "minus":
        return {"Difference": [a[i] - b[i] for i in range(min(len(a), len(b)))]}
    else:
        raise Exception("invalid parameter op")

# map via cell

@funix(
    title="""Automatic `map` in tables""",
    description="""Funix automatically maps a scalar function to rows in a sheet, just like `map` in Python. See the source code for details.**Usage:** Simply click 'Add a row' button to create new rows and then click cells to add numeric values. Finally, Run! """ ,
    widgets={
        ("a", "b"): "sheet",
    },
    treat_as={
        ("a", "b"): "cell"
    },
    show_source=True
)
def cell_test(a: int, b: int) -> int:
    return a + b 

# Show all widgets
@funix(
    show_source=True,
    description="Showing off all widgets supported by Funix. Be sure to click Submit to reveal the output widgets as well. More examples at [QuickStart](https://github.com/TexteaInc/funix-doc/blob/main/QuickStart.md)",

    # we only need to customized non-default/theme widgets
    widgets={'int_input_slider': 'slider',
             'float_input_slider': 'slider[0,10,0.1]',
             'bool_input_switch': 'switch',
             'literal_input_radio': 'radio',
             'literal_input_select': 'select',
             'str_input_textarea': 'textarea', 
             ('X', 'Y', 'Z'): 'sheet'}
)
def widget_showoff(
    int_input_slider: int=32,
    float_input_slider: float=411,
    int_input_default: int=123,
    float_input_default: float=78.92,
    bool_input_default: bool=True,
    bool_input_switch: bool=True,
    literal_input_radio: typing.Literal["add", "minus"]='add',
    literal_input_select: typing.Literal["a", "b", "c"]='c',
    str_input_default: str = "All animals are equal, but some animals are more equal than others. All animals are equal, but some animals are more equal than others. All animals are equal, but some animals are more equal than others.",
    str_input_textarea: str="This request may not be serviced in the Roman Province\
            of Judea due to the Lex Julia Majestatis, which disallows\
            access to resources hosted on servers deemed to be\
            operated by the People's Front of Jude",
    X: typing.List[int]=[1919, 1949, 1979, 2019],
    Y: typing.List[float]=[3.141, 2.718, 6.626, 2.997],
    Z: typing.List[str]=["Pi", "e", "Planck", "Speed of light"]
    ) -> Tuple[Markdown, str, Markdown, Audio, File, List[Video] ,  HTML, dict, Image, Markdown,  dict, Markdown, Figure, Code]: 

    matplotlib_figure = plt.figure()
    plt.plot(
        range(1,50), 
        [random.random() for i in range(1,50)],
        'r-'
        )
    plt.plot(
        range(1,50), 
        [random.random() for i in range(1,50)],
        'k--'
        )

    sum_ = calc(op=literal_input_radio, a=X, b=Y)

    code = {
            "lang": "python",
            "code": """from funix import funix

@funix()
def hello_world(name: str) -> str:
    return f"Hello, {name}"
"""
    }

    my_dict= {"name": "Funix",
              "Features": [
                    {"The laziest way to build apps in Python": ["Automatic UI generation from Python function signatures", "No UI code needed"]},
                    {"Partitioned": ["UI and logic are separated", "just like CSS for HTML", "or .sty in LaTeX"]},
                    "Scalable: Define one theme and then all variables of the same type will be in the same widget",
                    "Declarative: You can use JSON5 and YAML to configure your widgets",
                    "Non-intrusive",
              ],
              "version": 0.3}

    return """
## Output widgets supported by [Funix.io](http://Funix.io)
Basic types like _int_ or _str_ are for sure. **Markdown** or `HTML` strings are automatically rendered. But it does more, including tables, video players, Matplotlib plots, and the tree views of JSON strings.
""", \
        f"The sum of the first two numbers in the input panels is {int_input_slider + float_input_slider}", \
        "### Your function can return **video, image, audio, and binary files** and Funix will add a player/downloader for you. You can return multiple multimedia objects in a list and each of them will get a player.", \
        "http://curiosity.shoutca.st:8019/128", \
        "https://github.com/TexteaInc/funix-doc/blob/main/illustrations/workflow.png?raw=true",\
        ["http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4", "https://user-images.githubusercontent.com/438579/219586150-7ff491dd-dfea-41ea-bfad-4610abf1fe20.mp4"], \
        "<span style='color: blue'>JSON or dict returns can be rendered using our our sister project <a href='https://github.com/TexteaInc/json-viewer'>JSON-viewer!</a>. See the rendering results below </span>", \
        my_dict, \
        "https://opengraph.githubassets.com/1/TexteaInc/Json-viewer",\
        "### Results from table operations can be rendered as tables or JSON. The sum of the X and Y columns in the input table is below. Be sure to check the `Sheet` radio to view the result in a single-column sheet.", \
        sum_, \
        """### You can also return matplotlib plots and code blocks! """, \
        matplotlib_figure, \
        code


randomNumber = (random.randint(0, 100) + random.randint(0, 100)) / 2

@funix(
    title="Guess Number",
    description="Guess Number: Input two numbers, and the program will calculate the average of them. If the average "
                "number is program's guess number, you win! Otherwise, you lose.",
    argument_labels={
        "input1": "Number 1",
        "input2": "Number 2",
        "show": "Show me the number 😭"
    },
    widgets={
        "show": "switch",
        ("input1", "input2"): "slider[0, 100]"
    },
    input_layout=[
        [{"markdown": "**Guess Number**"}],
        [
            {"argument": "input1", "width": 6},
            {"argument": "input2", "width": 6}
        ],
        [{"dividing": "Cheat Option", "position": "left"}],
        [{"argument": "show", "width": 12}]
    ],
    show_source=True,
)
def guess(
    input1: int = 0,
    input2: int = 0,
    show: bool = False
) -> str:
    global randomNumber
    if show:
        return f"The number is {randomNumber}"
    else:
        if (input1 + input2) / 2 == randomNumber:
            result = f"You win! The number is {randomNumber}. And random number is reset."
            randomNumber = (random.randint(0, 100) + random.randint(0, 100)) / 2
            return result
        else:
            if (input1 + input2) / 2 > randomNumber:
                return "Bigger"
            else:
                return "Smaller"

# Default, choices, and example values 

@funix(
        title="Let users select",
        description="This example shows how to provide argument/input values that users can select from in the UI. Simpliy taking advantage of Python's default values for keyword arguments, Literal type in type hints, and the `example` parameter in Funix. ", 
        examples={"arg1": [1, 5, 7]}, 
        widgets={"arg2": "radio"}
)
def argument_selection(
        arg1: int, 
        arg2: typing.Literal["is", "is not"], 
        arg3: str="prime",
        ) -> str:
    return f"The number {arg1} {arg2} {arg3}."

# Plot and paste 
@funix(
        description="Visualize two columns of a table, where the two columns use different input UIs",
        widgets={
           "a": "sheet",
           "b": "sheet", "slider[0,1,0.01]"
        }
)

def slider_table_plot(
    a: List[int]=list(range(10)), 
    b: List[float] = [random.random() for _ in range(10)] 
    ) -> Figure:
    fig = plt.figure()
    plt.plot(a, b)
    return fig


# conditional visibility

# layout

# multi-page, a non-AI simple one 
haha="hello"
@funix(
        title="Multipage: Page 1",
        description= """
This demo shows how to pass data between pages. 

It's very simple. Each page is a Funix-decorated function. So just use a global variable to pass data between pages. 

Another example is OpenAI demos where OpenAI key is set in one page while DallE and GPT3 demos use the key in other pages. Check them out using the function selector above""", 
        argument_labels = {"x": "New value for `haha`"}, 
        show_source = True
)
def set_value_here(x: str) -> Markdown:
    global haha
    haha = x
    return f"The value of `haha` has been set to **{haha}**. Now check its value in 'Multipage: Page 2'. It should have already been changed."

@funix(
       title="Multipage: Page 2", 
       description = """
**Run 'Multiplage: Page 1' first**. 

Click the Run button to get the value of the variable `haha` set in 'Multipage: Page 1'. Default value of `haha` is 'hello'. """, 
        show_source = True 
)
def get_value_here() -> Markdown:
    return f"the value of `haha` is **{haha}**."


# AI

import openai  # pip install openai
openai.api_key = os.environ.get("OPENAI_KEY")


@funix( # Funix.io, the laziest way to build web apps in Python
  title="OpenAI: set key",
  argument_labels={
    "api_key": "Enter your API key", 
    "sys_env_var": "Use system environment variable"
  }, 
  conditional_visible=[ { "if": {"sys_env_var": False}, "then": ["api_key"],  } ],
    show_source=True
)
def set(api_key: str="", sys_env_var:bool=True) -> str:
    if sys_env_var:
        return "OpenAI API key is set in your environment variable. Nothing changes."
    else:
        if api_key == "":
            return "You entered an empty string. Try again."
        else:
            openai.api_key = api_key
            return "OpenAI API key has been set via the web form! If it was set via an environment variable, it's been overwritten."


@funix( # Funix.io, the laziest way to build web apps in Python
    title="OpenAI: Dall-E",
    description="""
Generate an image by prompt with DALL-E

You need to set your OpenAI API key first. To do so, click on the "Set OpenAI key" button above. Then come back here by clicking on the "Dall-E" button again.""",
    show_source=True
)
def dalle(Prompt: str = "a cat on a red jeep") -> Image:
    response = openai.Image.create(prompt=Prompt, n=1, size="1024x1024")
    return response["data"][0]["url"]


@funix(  # Funix.io, the laziest way to build web apps in Python
    title="OpenAI: GPT-3",
    description="""
Ask a question to GPT-3

You need to set your OpenAI API key first. To do so, click on the "Set OpenAI key" button above. Then come back here by clicking on the "Dall-E" button again.""",
    widgets={'Question': 'textarea',
             'temp':       'slider[0,1,0.1]', 
             'max_tokens': 'slider[20,100,20]', 
             'top_p':      'slider[0,1,0.1]'},
    show_source=True
)
def GPT3(Question: str = "Who is Fermat?", 
         temp: float=0.9, max_tokens: float=100, top_p: float=0.7) -> str:
    response = openai.Completion.create(engine="davinci",
        prompt= Question,
        temperature=temp, max_tokens=max_tokens, top_p=top_p,
        frequency_penalty=0.6, presence_penalty=0.0,
    )
    return f'The answer is: {response.choices[0].text}'