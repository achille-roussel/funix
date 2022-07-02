import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from "../shared";
import { List, ListItem, ListItemButton } from "@mui/material";
import { useStore } from "../store";

export const TexteaFunctionList: React.FC = () => {
  const [state, setState] = useState<{ functions: string[] }>({
    functions: [],
  });
  useEffect(() => {
    const abortController = new AbortController();
    async function queryData() {
      try {
        const record: any = await fetch(new URL("/list", API_URL), {
          signal: abortController.signal,
        }).then((response) => response.json());
        setState({
          functions: record.list,
        });
        console.log("fetch data success");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          // do nothing, only expect AbortError
        } else {
          throw e;
        }
      }
    }
    queryData().then();
    return () => {
      abortController.abort();
    };
  }, []);

  const handleFetchFunctionDetail = useCallback(
    async (functionName: string) => {
      useStore.setState({
        selectedFunction: functionName,
      });
    },
    []
  );
  return (
    <List>
      {state.functions.map((functionName) => (
        <ListItem key={`TexteaFunctionList-${functionName}`}>
          <ListItemButton
            onClick={() => handleFetchFunctionDetail(functionName)}
          >
            {functionName}
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};