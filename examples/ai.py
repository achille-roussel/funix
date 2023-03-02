import os # python native 

import openai  # pip install openai
openai.api_key = os.environ.get("OPENAI_KEY")

from funix import funix
from funix.hint import Image
from funix import run

@funix(
  title="Set OpenAI API key",
  argument_labels={
    "api_key": "Enter your API key", 
    "sys_env_var": "Use system environment variable"
  }, 
  conditional_visible=[
    {
      "if": {"sys_env_var": False},
      "then": ["api_key"],
    } ],
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


@funix(
    title="Dall-E",
    description="Generate an image by prompt with DALL-E",
    widgets={'Prompt': 'textarea'},
    examples={'Prompt':["a cat on a red Tesla", 
                        "a cat flying Boeing 747", 
                        "a cat riding Saturn V rocket"]},
    show_source=True
)
def dalle(Prompt: str = "a cat flying boeing 747") -> Image:
    response = openai.Image.create(prompt=Prompt, n=1, size="1024x1024")
    return response["data"][0]["url"]


@funix(
    description="Ask a question to GPT-3",
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


if __name__ == "__main__":
    run(port=3000, main_class="ai")
