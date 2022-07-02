# PyDataFront

Supported Types: `int`, `float`, `str`, `list`, `dict`

## Setup and Usage

### Backend

Place your functions in `backend/function.py`. 

```shell
cd backend
python3 -m pip install -r ./pydatafront/requirements.txt
python3 -m pydatafront functions --host localhost --port 4010
```


### Frontend

First, install `npm` and `yarn` in whatever way you like. Lots of solutions on the Internet. 

Then, 
```
cd frontend
npm install react-scripts
yarn start 
```

Finally you can visit http://localhost:3000
