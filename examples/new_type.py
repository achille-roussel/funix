from funix import funix, new_funix_type

@new_funix_type(
    # widget= 
        {
            "widget": "@mui/material/TextField",
            "props": {
                "type": "password",
            },
        }
    )
class blackout(str):
    def print(self):
        return self + " is the message."

def hoho(x: blackout = "Funix Rocks!") -> str:
    return x.print()

if __name__ == "__main__":
    print (hoho(blackout('Fun'))) 