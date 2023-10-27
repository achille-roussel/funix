"""
Save the app instance here
"""
import re
from secrets import token_hex

import flask

app = flask.Flask(__name__)
app.secret_key = token_hex(16)
app.config.update(
    SESSION_COOKIE_PATH="/",
    SESSION_COOKIE_SAMESITE="Lax",
)


@app.after_request
def funix_auto_cors(response: flask.Response) -> flask.Response:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers[
        "Access-Control-Allow-Methods"
    ] = "GET, HEAD, POST, OPTIONS, PUT, PATCH, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


regex_string = None


def enable_funix_host_checker(regex: str):
    global regex_string
    regex_string = regex

    @app.before_request
    def funix_host_check():
        if len(re.findall(regex_string, flask.request.host)) == 0:
            flask.abort(403)
