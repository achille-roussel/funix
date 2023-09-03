import typing 

import funix

@funix.funix(
    widgets={
        "model": "radio"
    }
)

def input_types(
    prompt: str, 
    advanced_features: bool = False,
    model: typing.Literal['GPT-3.5', 'GPT-4.0', 'Llama-2', 'Falcon-7B']= 'GPT-4.0',
    max_token: range(100, 200, 20)=140,
    )  -> str:      
    pass