import React, { useEffect, useState } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Form from "@rjsf/material-ui/v5";
import {
  BaseType,
  callFunctionRaw,
  FunctionDetail,
  FunctionPreview,
  ReturnType,
} from "../../shared";
import useSWR from "swr";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import ReactJson from "react-json-view";
import TextExtendedWidget from "./TextExtendedWidget";
import ObjectFieldExtendedTemplate from "./ObjectFieldExtendedTemplate";
import { DataGrid } from "@mui/x-data-grid";
import { GridRowModel } from "@mui/x-data-grid/models/gridRows";
import SwitchWidget from "./SwitchWidget";
import OutputPlot from "./OutputComponents/OutputPlot";
import MarkdownDiv from "../Common/MarkdownDiv";
import OutputCode from "./OutputComponents/OutputCode";
import OutputFiles from "./OutputComponents/OutputFiles";
import OutputMedias from "./OutputComponents/OutputMedias";
import { outputRow } from "json-schema";
import Grid2 from "@mui/material/Unstable_Grid2";
import { useAtom } from "jotai";
import { storeAtom } from "../../store";
import Switch from "@mui/material/Switch";

export type FunctionDetailProps = {
  preview: FunctionPreview;
  backend: URL;
};

const FunixFunction: React.FC<FunctionDetailProps> = ({ preview, backend }) => {
  const { data: detail } = useSWR<FunctionDetail>(
    new URL(`/param/${preview.path}`, backend).toString()
  );
  const [form, setForm] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<string | null>(null);
  const [{ showFunctionDetail }, setStore] = useAtom(storeAtom);

  if (detail == null) {
    console.log("Failed to display function detail");
    return <div />;
  } else {
    useEffect(() => {
      setStore((store) => ({
        ...store,
        theme: functionDetail.theme,
      }));
    }, []);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const functionDetail = detail!;

  const handleChange = ({ formData }: Record<string, any>) => {
    // console.log("Data changed: ", formData);
    setForm(formData);
  };

  const handleSubmit = async () => {
    console.log("Data submitted: ", form);
    const response = await callFunctionRaw(
      new URL(`/call/${functionDetail.id}`, backend),
      form
    );
    setResponse(response.toString());
  };

  const widgets = {
    TextWidget: TextExtendedWidget,
    CheckboxWidget: SwitchWidget,
  };

  const uiSchema = {
    "ui:ObjectFieldTemplate": ObjectFieldExtendedTemplate,
    "ui:submitButtonOptions": {
      norender: true,
    },
  };

  type ResponseViewProps = {
    response: string | null;
    returnType?: { [key: string]: BaseType } | ReturnType[] | ReturnType;
  };

  const getSingleResponse = (response: string): any => {
    try {
      const result = JSON.parse(response);
      if ("error_body" in result && "error_type" in result) return result;
      else return [result];
    } catch (unusedError) {
      return [response];
    }
  };

  const GuessingDataView: React.FC<ResponseViewProps> = ({ response }) => {
    if (response === null) {
      return <></>;
    } else {
      try {
        const parsedResponse: object = JSON.parse(response);
        const is1dArray = (target: any) => {
          if (!Array.isArray(target)) return false;
          else {
            for (const row of target)
              if (
                Array.isArray(row) ||
                typeof row === "object" ||
                typeof row === "function"
              )
                return false;
            return true;
          }
        };
        if (typeof parsedResponse !== "object" && !is1dArray(parsedResponse)) {
          return <code>{response ?? ""}</code>;
        }
        const [selectedResponseViewType, setSelectedResponseViewType] =
          useState<string>("json");
        const handleResponseViewChange = (
          e: React.ChangeEvent<HTMLInputElement>
        ) => {
          setSelectedResponseViewType(e.target.value);
        };
        const responseViewRadioGroup = (
          <FormControl>
            <FormLabel id="response-view-radio-group">View in</FormLabel>
            <RadioGroup
              row
              aria-labelledby="response-view-radio-group"
              name="response-view-radio-group"
              value={selectedResponseViewType}
              onChange={handleResponseViewChange}
            >
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
              <FormControlLabel
                value="sheet"
                control={<Radio />}
                label="Sheet"
              />
            </RadioGroup>
          </FormControl>
        );
        if (Array.isArray(parsedResponse) && is1dArray(parsedResponse)) {
          const SelectedResponseView = (props: any) => {
            if (props.selectedResponseViewType === "json")
              return <ReactJson src={parsedResponse ?? {}} />;
            else if (props.selectedResponseViewType === "sheet")
              return (
                <DataGrid
                  columns={[{ field: "root" }]}
                  rows={parsedResponse.map((rowValue, index) => ({
                    id: index,
                    root: rowValue,
                  }))}
                />
              );
            else throw new Error("Unsupported selectedResponseViewType");
          };
          return (
            <div>
              {responseViewRadioGroup}
              <SelectedResponseView
                selectedResponseViewType={selectedResponseViewType}
              />
            </div>
          );
        } else if (
          typeof parsedResponse === "object" &&
          parsedResponse !== null
        ) {
          const keysOfArraysInSheet: string[] = [];
          for (const [k, v] of Object.entries(parsedResponse)) {
            if (Array.isArray(v) && is1dArray(v)) {
              keysOfArraysInSheet.push(k);
            }
          }
          if (keysOfArraysInSheet.length === 0)
            return <ReactJson src={parsedResponse ?? {}} />;
          else {
            const SelectedResponseView = (props: any) => {
              if (props.selectedResponseViewType === "json")
                return <ReactJson src={parsedResponse ?? {}} />;
              else if (props.selectedResponseViewType === "sheet") {
                const rows: GridRowModel[] = [];
                let newObject: object = {};
                for (const [k, v] of Object.entries(parsedResponse)) {
                  if (keysOfArraysInSheet.includes(k)) {
                    v.map((rowValue: any, index: number) => {
                      if (index < rows.length) {
                        rows[index] = {
                          ...rows[index],
                          [k]: rowValue,
                        };
                      } else {
                        rows.push({
                          id: index,
                          [k]: rowValue,
                        });
                      }
                    });
                  } else {
                    newObject = { ...newObject, [k]: v };
                  }
                }
                const grid = (
                  <DataGrid
                    columns={keysOfArraysInSheet.map((key) => ({
                      field: key,
                    }))}
                    rows={rows}
                    sx={{ minHeight: 400 }}
                  />
                );
                if (Object.keys(newObject).length != 0) {
                  return (
                    <div>
                      {grid}
                      <ReactJson src={newObject} />
                    </div>
                  );
                } else return grid;
              } else throw new Error("Unsupported selectedResponseViewType");
            };
            return (
              <div>
                {responseViewRadioGroup}
                <SelectedResponseView
                  selectedResponseViewType={selectedResponseViewType}
                />
              </div>
            );
          }
        } else {
          return <ReactJson src={parsedResponse ?? {}} />;
        }
      } catch (e) {
        return <code>{response ?? ""}</code>;
      }
    }
  };

  const getTypedElement = (
    elementType: ReturnType,
    response: any,
    index: number
  ): JSX.Element => {
    switch (elementType) {
      case "figure":
        return (
          <OutputPlot
            plotCode={JSON.stringify(response)}
            indexId={index.toString()}
          />
        );
      case "string":
      case "text":
        return <span>{response}</span>;
      case "number":
      case "integer":
        return <code>{response}</code>;
      case "boolean":
        return (
          <Switch
            checked={response}
            value={response}
            onChange={() => {
              /* oh */
            }}
          />
        );
      case "array":
      case "list":
      case "object":
      case "dict":
        return <GuessingDataView response={JSON.stringify(response)} />;
      case "Markdown":
        return <MarkdownDiv markdown={response} isRenderInline={false} />;
      case "HTML":
        return <div dangerouslySetInnerHTML={{ __html: response }} />;
      case "Images":
      case "Videos":
      case "Audios":
        return (
          <OutputMedias
            medias={response}
            type={elementType}
            backend={backend.toString()}
          />
        );
      case "Code":
        if (typeof response === "string") {
          return <OutputCode code={response} />;
        } else {
          const outputCodeProp = response as {
            content: string;
            lang?: string;
          };
          return (
            <OutputCode
              code={outputCodeProp.content}
              language={outputCodeProp.lang}
            />
          );
        }
      case "Files":
        return <OutputFiles files={response} backend={backend.toString()} />;
      default:
        return <GuessingDataView response={JSON.stringify(response)} />;
    }
  };

  const ResponseView: React.FC<ResponseViewProps> = ({
    response,
    returnType,
  }) => {
    if (response == null) {
      return (
        <Alert severity="info">
          Execute the function first to see response here
        </Alert>
      );
    } else {
      if (
        typeof returnType !== undefined &&
        (Array.isArray(returnType) || typeof returnType === "string")
      ) {
        const listReturnType =
          typeof returnType === "string" ? [returnType] : returnType;
        const parsedResponse =
          typeof returnType === "string"
            ? getSingleResponse(response)
            : JSON.parse(response);
        if (!Array.isArray(parsedResponse))
          // but never, error lol
          return <ReactJson src={parsedResponse} />;
        const output: outputRow[] = functionDetail.schema.output_layout;
        const layout: JSX.Element[] = [];
        output.forEach((row) => {
          const rowElements: JSX.Element[] = [];
          row.forEach((item) => {
            let itemElement: JSX.Element;
            switch (item.type) {
              case "markdown":
                itemElement = (
                  <MarkdownDiv
                    markdown={
                      (Array.isArray(item.content)
                        ? item.content[0]
                        : item.content) || ""
                    }
                    isRenderInline={false}
                  />
                );
                break;
              case "html":
                itemElement = (
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        (Array.isArray(item.content)
                          ? item.content[0]
                          : item.content) || "",
                    }}
                  />
                );
                break;
              case "dividing":
                itemElement =
                  item.content !== undefined ? (
                    <Divider textAlign={item.position || "left"}>
                      {item.content}
                    </Divider>
                  ) : (
                    <Divider />
                  );
                break;
              case "images":
              case "videos":
              case "audios":
                itemElement = (
                  <OutputMedias
                    medias={item.content || ""}
                    type={item.type}
                    backend={backend.toString()}
                  />
                );
                break;
              case "files":
                itemElement = (
                  <OutputFiles
                    files={item.content || ""}
                    backend={backend.toString()}
                  />
                );
                break;
              case "code":
                itemElement = (
                  <OutputCode
                    code={
                      (Array.isArray(item.content)
                        ? item.content[0]
                        : item.content) || ""
                    }
                    language={item.lang}
                  />
                );
                break;
              case "return":
                itemElement = getTypedElement(
                  listReturnType[item.return || 0],
                  parsedResponse[item.return || 0],
                  item.return || 0
                );
                break;
              default:
                itemElement = <code>{item.content ?? ""}</code>;
            }
            rowElements.push(
              <Grid2 xs={item.width || true} mdOffset={item.offset}>
                {itemElement}
              </Grid2>
            );
          });
          layout.push(
            <Grid2 container spacing={2} alignItems="center">
              {rowElements}
            </Grid2>
          );
        });
        const columns = parsedResponse
          .filter((_, index) => {
            if (Array.isArray(functionDetail.schema.output_indexs)) {
              return functionDetail.schema.output_indexs.indexOf(index) === -1;
            } else {
              return true;
            }
          })
          .map((row, index) => {
            const singleReturnType: ReturnType = listReturnType[index];

            return getTypedElement(singleReturnType, row, index);
          });
        return (
          <>
            {layout}
            {columns}
          </>
        );
      } else {
        return <GuessingDataView response={response} />;
      }
    }
  };

  const formElement = (
    <Form
      schema={functionDetail.schema}
      formData={form}
      onChange={handleChange}
      widgets={widgets}
      uiSchema={uiSchema}
    />
  );

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              {formElement}
              <Button variant="contained" onClick={handleSubmit} sx={{ mt: 1 }}>
                Submit
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h5">Response</Typography>
                  <ResponseView
                    response={response}
                    returnType={functionDetail.return_type}
                  />
                </Stack>
              </CardContent>
            </Card>
            {showFunctionDetail ? (
              <Card>
                <CardContent>
                  <Typography variant="h5">Function Detail</Typography>
                  <ReactJson src={functionDetail} collapsed />
                </CardContent>
              </Card>
            ) : (
              <></>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default FunixFunction;
