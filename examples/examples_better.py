import random
from typing import List
import matplotlib.pyplot as plt
from funix.decorator import funix, funix_yaml


@funix(
    widgets={
        "arg1": "switch"
    },
    treat_as={
        "arg2": "column"
    },
    whitelist={
        "arg2": ["a", "b", "c"]
    }
)
def elegant(arg1: bool, arg2: str) -> dict:
    return {
        "arg1": arg1,
        "arg2": arg2
    }

@funix(
    labels={
        "input1": "Reactant 1",
        "input2": "Reactant 2",
        "output": "Resultant",
        "condition": "Reaction Condition",
        "extra": "Whether the resultant is a gas or not (the reactant has no gas)"
    },
    whitelist={
        "condition": ["Heating", "High Temperature", "Electrolysis"]
    },
    widgets={
        "extra": "switch"
    }
)
def chemist(
    input1: str = "S",
    input2: str = "O₂",
    output: str = "SO₂",
    condition: str = "Heating",
    extra: bool = False
) -> str:
    return f"{input1} + {input2} --{condition}-> {output}{'↑' if extra else ''}"

randomNumber = (random.randint(0, 100) + random.randint(0, 100)) / 2

@funix(
    description="Guess Number: Input two numbers, and the program will calculate the average of them. If the average number is program's guess number, you win! Otherwise, you lose.",
    labels={
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
    ]
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

@funix(
    argument_config={
        "test": {
            "treat_as": "config",
            "widget": "switch"
        }
    }
)
def argument_config(test: bool) -> dict:
    return {
        "test": test
    }

@funix(
    widgets={
        "arg1": ["sheet", "slider"]
    }
)
def slider_in_sheet(arg1: List[int]):
    return {
        "arg1": arg1
    }

@funix(
    examples={
        ("test", "test2"): [
            ["hello", "hi"],
            ["world", "funix"]
        ]
    }
)
def greet(test: str, test2: str) -> str:
    return f"{test} {test2}"

@funix(
    return_type = "plot",
    widgets = {
        ("year", "period"): "sheet"
    },
    treat_as={
        ("year", "period"): "column"
    }
)
def plot_test(year: List[int], period: List[float]):
    fig = plt.figure()
    plt.plot(year, period)
    return fig

@funix(
    widgets = {
        "more_config": "switch"
    },
    conditional_visible = [
        {
            "if": {"more_config": True},
            "then": ["arg1", "arg2"]
        }
    ]
)
def if_then(
    more_config: bool,
    arg1: str = "None",
    arg2: str = "None"
):
    return {
        "arg1": arg1,
        "arg2": arg2
    }

@funix_yaml("""
labels:
    arg1: isGood
widgets:
    arg1: switch
""")
def yaml_export(arg1: bool = False) -> dict:
    return {
        "arg1": arg1
    }
