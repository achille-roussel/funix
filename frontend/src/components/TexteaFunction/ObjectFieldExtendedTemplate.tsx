import { ObjectFieldProps } from "@rjsf/core/lib/components/fields/ObjectField";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  MenuList,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import React, { SyntheticEvent, useEffect, useState } from "react";
import SchemaField from "@rjsf/core/lib/components/fields/SchemaField";
import {
  DataGrid,
  GridCellEditCommitParams,
  GridColDef,
  GridColumnMenuContainer,
  GridColumnMenuProps,
  GridPreProcessEditCellProps,
  GridRowsProp,
  GridSelectionModel,
  SortGridMenuItems,
  HideGridColMenuItem,
  GridFilterMenuItem,
  GridColumnsMenuItem,
  GridRowId,
} from "@mui/x-data-grid";
import {
  bindHover,
  bindMenu,
  bindPopover,
  bindTrigger,
} from "material-ui-popup-state";
import HoverPopover from "material-ui-popup-state/HoverPopover";
import { usePopupState } from "material-ui-popup-state/hooks";
import SheetSwitch from "../SheetComponents/SheetSwitch";
import SheetSlider from "../SheetComponents/SheetSlider";
import SheetCheckBox from "../SheetComponents/SheetCheckBox";
import MarkdownIt from "markdown-it";
import JSONEditorWidget from "./JSONEditorWidget";
import { castValue, getInitValue } from "../Common/ValueOperation";
import { GridRowModel } from "@mui/x-data-grid/models/gridRows";

let rowIdCounter = 0;

const stopEventPropagation = (e: SyntheticEvent) => e.stopPropagation();

const ObjectFieldExtendedTemplate = (props: ObjectFieldProps) => {
  const configElements: SchemaField[] = [];
  const simpleElements: JSX.Element[] = [];
  const arrayElementsInSheet: any[] = [];
  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      type: "number",
    },
  ];
  const arraySimpleSelectors: JSX.Element[] = [];
  let arraySheetSelectors: Record<string, any> = {};
  let lengthLongestWhitelistColumnInSheet = 0;

  props.properties.map((element: any) => {
    const elementContent = element.content;
    const elementProps = elementContent.props;
    const isArray = elementProps.schema.type === "array";
    const isArrayInSheet =
      elementProps.schema.type === "array" &&
      elementProps.schema.hasOwnProperty("widget") &&
      elementProps.schema.widget === "sheet";
    const hasArrayExample =
      isArray &&
      elementProps.schema.hasOwnProperty("example") &&
      Array.isArray(elementProps.schema.example) &&
      elementProps.schema.example.length != 0 &&
      Array.isArray(elementProps.schema.example[0]);
    const hasArrayWhitelist =
      isArray &&
      elementProps.schema.hasOwnProperty("whitelist") &&
      Array.isArray(elementProps.schema.whitelist) &&
      elementProps.schema.whitelist.length != 0 &&
      Array.isArray(elementProps.schema.whitelist[0]);
    const enum MenuItemGetterType {
      SimpleSelectorExample,
      SimpleSelectorWhitelist,
      SheetSelector,
    }

    if (!isArray) {
      if (elementContent.props.schema.widget === "json") {
        if (elementContent.props.schema.keys) {
          simpleElements.push(
            <JSONEditorWidget
              widget={elementContent.props}
              checkType={""}
              keys={elementContent.props.schema.keys}
            />
          );
        } else {
          simpleElements.push(
            <JSONEditorWidget widget={elementContent.props} checkType={""} />
          );
        }
      } else {
        configElements.push(elementContent);
      }
    } else {
      if (hasArrayExample || hasArrayWhitelist) {
        // Array Selector, Shared Part
        let arraySelectorCandidates: Array<any>[];

        if (hasArrayExample)
          arraySelectorCandidates = elementProps.schema.example;
        else {
          arraySelectorCandidates = elementProps.schema.whitelist;
          arraySelectorCandidates.map((candidate) => {
            lengthLongestWhitelistColumnInSheet = Math.max(
              lengthLongestWhitelistColumnInSheet,
              candidate.length
            );
          });
        }

        const [candidateValueSelected, setCandidateValueSelected] = useState<
          string | []
        >([]);

        const handleCandidateSelectionEvent = (e: SelectChangeEvent<any>) =>
          handleCandidateSelection(e.target.value);

        const handleCandidateSelection = (newSelection: string) => {
          const targetArray: any[] = JSON.parse(newSelection);
          const possiblySheetColumns = columns.filter(
            (column) => column.field == elementProps.name
          );
          if (possiblySheetColumns.length != 0) {
            if (rows.length < targetArray.length) {
              const currentRowsLength = rows.length;
              for (let i = 0; i < targetArray.length - currentRowsLength; i++) {
                handleAddRow();
              }
            }
            setRows((prevRows) => {
              const newRows = [...prevRows];
              newRows.map((row, index) => {
                if (index < targetArray.length) {
                  row[elementProps.name] = targetArray[index];
                } else {
                  const columnType = possiblySheetColumns[0].type;
                  row[elementProps.name] = getInitValue(columnType);
                }
              });
              return newRows;
            });
          } else {
            elementProps.onChange(targetArray);
          }
          if (hasArrayWhitelist) {
            setCandidateValueSelected(newSelection);
          }
        };

        const getMenuItems = (
          candidates: Array<any>[],
          type: MenuItemGetterType,
          props: any
        ) =>
          candidates.map((candidate) => {
            const candidateJson = JSON.stringify(candidate, null, 1);
            const candidateRows: GridRowsProp = candidate.map(
              (candidateRowValue, index) => {
                const rowValueJsonStr = JSON.stringify(candidateRowValue);
                const toUseJson =
                  rowValueJsonStr.length > 0 &&
                  (rowValueJsonStr[0] == "[" || rowValueJsonStr[0] == "{");
                return {
                  id: index,
                  [elementProps.name]: toUseJson
                    ? rowValueJsonStr
                    : candidateRowValue,
                };
              }
            );
            const popupState = usePopupState({
              variant: "popover",
              popupId: `popover-${elementProps.name}`,
            });
            let handleMenuItemClick = () => {
              return;
            };
            if (type === MenuItemGetterType.SimpleSelectorExample) {
              handleMenuItemClick = () => {
                handleCandidateSelection(candidateJson);
                props.parentPopupState.close();
              };
            }
            if (type === MenuItemGetterType.SheetSelector) {
              handleMenuItemClick = () => {
                handleCandidateSelection(candidateJson);
                props.setDialogOpen(false);
              };
            }
            const stopEventPropagationIfNotSheet = (e: SyntheticEvent) => {
              if (type !== MenuItemGetterType.SheetSelector)
                stopEventPropagation(e);
            };
            // HoverPopover not working on Sheet Fill Selector
            return (
              <MenuItem value={candidateJson} onClick={handleMenuItemClick}>
                <code {...bindHover(popupState)}>{candidateJson}</code>
                <HoverPopover
                  {...bindPopover(popupState)}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                  }}
                >
                  <Card
                    onClick={stopEventPropagationIfNotSheet}
                    onMouseDown={stopEventPropagationIfNotSheet}
                    sx={{ padding: 1 }}
                  >
                    <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                      Column Preview
                    </Typography>
                    <DataGrid
                      columns={[{ field: elementProps.name, minWidth: 350 }]}
                      rows={candidateRows}
                      sx={{ minHeight: 400 }}
                    />
                  </Card>
                </HoverPopover>
              </MenuItem>
            );
          });

        if (!isArrayInSheet) {
          // Array Selector, Simple Widget
          let arraySimpleSelector;
          const labelText = `${elementProps.name} Selector (${
            hasArrayWhitelist ? "whitelist" : "example"
          })`;

          if (hasArrayWhitelist) {
            arraySimpleSelector = (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>{labelText}</InputLabel>
                  <Select
                    label={labelText}
                    value={candidateValueSelected}
                    onChange={handleCandidateSelectionEvent}
                    MenuProps={{
                      disableScrollLock: true,
                    }}
                  >
                    {getMenuItems(
                      arraySelectorCandidates,
                      MenuItemGetterType.SimpleSelectorWhitelist,
                      {}
                    )}
                  </Select>
                </FormControl>
              </Box>
            );
          } else {
            arraySimpleSelector = (() => {
              const popupState = usePopupState({
                variant: "popover",
                popupId: "demoMenu",
              });
              return (
                <div>
                  <Button {...bindTrigger(popupState)}>{labelText}</Button>
                  <Menu {...bindMenu(popupState)} disableScrollLock={true}>
                    {getMenuItems(
                      arraySelectorCandidates,
                      MenuItemGetterType.SimpleSelectorExample,
                      {
                        parentPopupState: popupState,
                      }
                    )}
                  </Menu>
                </div>
              );
            })();
          }
          arraySimpleSelectors.push(arraySimpleSelector);
        } else {
          // Array Selector, Sheet Widget (GridColumn)
          const labelText = `Fill (${
            hasArrayWhitelist ? "whitelist" : "example"
          })`;
          arraySheetSelectors = {
            ...arraySheetSelectors,
            [elementProps.name]: (props: any) => ({
              label: labelText,
              menuItems: getMenuItems(
                arraySelectorCandidates,
                MenuItemGetterType.SheetSelector,
                props
              ),
            }),
          };
        }
      }

      if (!isArrayInSheet && !hasArrayWhitelist) {
        if (elementContent.props.schema.widget === "json") {
          simpleElements.push(
            <JSONEditorWidget
              widget={elementContent.props}
              checkType={
                elementContent.props.schema.items?.type || "DO_NOT_CHECK"
              }
            />
          );
        } else {
          configElements.push(elementContent);
        }
      }
      if (isArrayInSheet) {
        arrayElementsInSheet.push(elementContent);
        const itemType = elementProps.schema.items.type;
        const itemWidget = elementProps.schema.items.widget;
        const gridColType = itemType === "integer" ? "number" : itemType;
        let newColumn: GridColDef = {
          field: elementProps.name,
          type: gridColType,
          editable: !hasArrayWhitelist,
        };
        const handleCustomComponentChange = (
          rowId: GridRowId,
          field: string,
          value: any
        ) => {
          setRows((prevRows) => {
            const newRows = [...prevRows];
            newRows.map((row) => {
              if (row.id === rowId) {
                row[field] = value;
              }
            });
            return newRows;
          });
        };
        if (itemType === "integer") {
          newColumn = {
            ...newColumn,
            preProcessEditCellProps: (params: GridPreProcessEditCellProps) => ({
              ...params.props,
              error: !Number.isInteger(Number(params.props.value)),
            }),
          };
        }

        switch (itemType) {
          case "number":
            if (itemWidget.indexOf("slider") !== -1) {
              newColumn = {
                ...newColumn,
                width: 200,
                editable: false,
                renderCell: (params) => {
                  return (
                    <SheetSlider
                      widget={itemWidget}
                      type={itemType}
                      params={params}
                      customChange={handleCustomComponentChange}
                    />
                  );
                },
              };
            }
            break;
          case "integer":
            if (itemWidget.indexOf("slider") !== -1) {
              newColumn = {
                ...newColumn,
                editable: false,
                width: 200,
                renderCell: (params) => {
                  return (
                    <SheetSlider
                      widget={itemWidget}
                      type={itemType}
                      params={params}
                      customChange={handleCustomComponentChange}
                    />
                  );
                },
              };
            }
            break;
          case "boolean":
            if (itemWidget === "switch") {
              newColumn = {
                ...newColumn,
                editable: false,
                renderCell: (params) => {
                  return (
                    <SheetSwitch
                      widget={itemWidget}
                      type={itemType}
                      params={params}
                      customChange={handleCustomComponentChange}
                    />
                  );
                },
              };
            }
            if (itemWidget === "checkbox") {
              newColumn = {
                ...newColumn,
                editable: false,
                renderCell: (params) => {
                  return (
                    <SheetCheckBox
                      widget={itemWidget}
                      type={itemType}
                      params={params}
                      customChange={handleCustomComponentChange}
                    />
                  );
                },
              };
            }
            break;
        }

        columns.push(newColumn);
      }
    }
  });

  // Sheet Fields and Utils
  const types: (string | undefined)[] = [];
  const fields: string[] = [];
  columns.forEach((column: GridColDef) => {
    types.push(column.type);
    fields.push(column.field);
  });

  const [rows, setRows] = React.useState<GridRowsProp>([]);
  useEffect(() => {
    updateRJSFObjectField().then(() => null);
    return;
  }, [rows]);
  const [selectionModel, setSelectionModel] =
    React.useState<GridSelectionModel>([]);

  let gridData: Record<string, Array<any>> = {};
  let updateRJSFObjectFieldOpIdCounter = 0;

  const updateRJSFObjectField = async () => {
    updateRJSFObjectFieldOpIdCounter++;
    const currentOpId = updateRJSFObjectFieldOpIdCounter;
    columns.map((column) => {
      gridData = {
        ...gridData,
        [column.field]: [],
      };
    });
    rows.map((row) => {
      Object.entries(row).map(([key, value]) => {
        gridData[key].push(value);
      });
    });
    for (const column of columns) {
      if (column.field == "id") continue;
      const arrayElementsWithKey = arrayElementsInSheet.filter(
        (arrayElement) => arrayElement.key === column.field
      );
      for (const arrayElementWithKey of arrayElementsWithKey) {
        arrayElementWithKey.props.onChange(gridData[arrayElementWithKey.key]);
        const promiseCheckSyncFunction = (
          resolve: (value: void | PromiseLike<void>) => void
        ) => {
          const checkIfFormDataSynced = () =>
            props.formData[arrayElementWithKey.key] !==
            gridData[arrayElementWithKey.key];
          setTimeout(async () => {
            if (
              currentOpId === updateRJSFObjectFieldOpIdCounter &&
              !checkIfFormDataSynced()
            )
              await new Promise<void>(promiseCheckSyncFunction);
            resolve();
          }, 10);
        };
        await new Promise<void>(promiseCheckSyncFunction);
      }
    }
  };

  const handleAddRow = () => {
    const newRow = (() => {
      let row = { id: rowIdCounter++ };
      columns.map((columnDef) => {
        if (columnDef.field === "id") return;
        const value = getInitValue(columnDef.type);
        row = {
          ...row,
          [columnDef.field]: value,
        };
      });
      return row;
    })();
    setRows((prevRows) => [...prevRows, newRow]);
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then((clipText: string) => {
      const allLines: string[] = clipText.split("\n");
      const splitLines: (string[] | undefined)[] = allLines.map(
        (line: string) => {
          const result = line
            .split("\t")
            .map((element: string) => element.trim());
          if (result.length === columns.length - 1) return result;
        }
      );
      splitLines.forEach((lineArray: string[] | undefined) => {
        if (lineArray === undefined) return;
        const row: { [key: string]: any } = { id: rowIdCounter++ };
        lineArray.forEach((value: string, index: number) => {
          row[fields[index + 1]] = castValue(value, types[index + 1]);
        });
        setRows((prevRows) => [...prevRows, row]);
      });
    });
  };

  const handleCopy = () => {
    let copyString = "";
    const copyRows = rows.filter((row: GridRowModel) =>
      selectionModel.includes(row.id)
    );
    copyRows.forEach((row: GridRowModel) => {
      fields.forEach((field: string, index: number) => {
        if (index === 0) return;
        copyString += `${row[field]}\t`;
      });
      copyString = copyString.substring(0, copyString.length - 1) + "\n";
    });
    navigator.clipboard.writeText(copyString).then(() => {
      copyString = "";
    });
  };

  const handleDeleteRows = () => {
    const newRows = rows.filter(
      (row, index) =>
        !selectionModel.includes(row.id) ||
        index < lengthLongestWhitelistColumnInSheet
    );
    setRows(newRows);
  };

  const handleSelectionModelChange = (
    newSelectionModel: GridSelectionModel
  ) => {
    setSelectionModel(newSelectionModel);
  };

  const handleCellEditCommit = (params: GridCellEditCommitParams) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows.map((row) => {
        if (row.id === params.id) {
          row[params.field] = params.value;
        }
      });
      return newRows;
    });
  };

  const getNewDataGridElementIfAvailable = () => {
    if (arrayElementsInSheet.length != 0)
      return (
        <Card className="property-wrapper" sx={{ mt: 1 }}>
          <Box sx={{ width: "100%" }} padding={1}>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleAddRow}>
                Add a row
              </Button>
              <Button size="small" onClick={handleDeleteRows}>
                Delete selected row(s)
              </Button>
              <Button size="small" onClick={handleCopy}>
                Copy
              </Button>
              <Button size="small" onClick={handlePaste}>
                Paste
              </Button>
            </Stack>
            <Box sx={{ height: 400, mt: 1, paddingRight: 1 }}>
              <DataGrid
                columns={columns}
                rows={rows}
                checkboxSelection={true}
                selectionModel={selectionModel}
                onSelectionModelChange={handleSelectionModelChange}
                onCellEditCommit={handleCellEditCommit}
                disableSelectionOnClick={true}
                components={{
                  ColumnMenu: GridColumnMenu,
                }}
                sx={{ marginRight: 1 }}
              />
            </Box>
          </Box>
        </Card>
      );
    else return <></>;
  };

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMenuListContent, setDialogMenuListContent] = useState<any>(
    <></>
  );
  const GridColumnMenu = React.forwardRef<
    HTMLUListElement,
    GridColumnMenuProps
  >(function GridColumnMenu(props: GridColumnMenuProps, ref) {
    const { hideMenu, currentColumn } = props;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const forcedCurrentColumn = currentColumn!;
    const fieldName = forcedCurrentColumn.field;
    let extraMenuItem = <></>;
    if (arraySheetSelectors.hasOwnProperty(fieldName)) {
      const arraySheetSelector = arraySheetSelectors[fieldName]({
        setDialogOpen: setDialogOpen,
      });
      const handleMenuItemClick = (e: React.MouseEvent<any>) => {
        hideMenu(e);
        setDialogTitle(`${arraySheetSelector.label} of ${fieldName}`);
        setDialogMenuListContent(arraySheetSelector.menuItems);
        setDialogOpen(true);
      };
      extraMenuItem = (
        <div>
          <MenuItem onClick={handleMenuItemClick}>
            {arraySheetSelector.label}
          </MenuItem>
        </div>
      );
    }
    return (
      <GridColumnMenuContainer ref={ref} {...props}>
        <SortGridMenuItems onClick={hideMenu} column={forcedCurrentColumn} />
        <GridFilterMenuItem onClick={hideMenu} column={forcedCurrentColumn} />
        <HideGridColMenuItem onClick={hideMenu} column={forcedCurrentColumn} />
        <GridColumnsMenuItem onClick={hideMenu} column={forcedCurrentColumn} />
        {extraMenuItem}
      </GridColumnMenuContainer>
    );
  });

  // Object Rendering

  const renderElement = (element: any) => (
    <div className="property-wrapper">
      <Box sx={{ mt: 1 }}>{element}</Box>
    </div>
  );

  const markdownHTML = new MarkdownIt({
    html: true,
    xhtmlOut: true,
    breaks: true,
    linkify: true,
    typographer: true,
  }).renderInline(props.description);

  return (
    <Stack spacing={1}>
      <Typography variant="h5">{props.title}</Typography>
      <Typography variant="body1">
        <div dangerouslySetInnerHTML={{ __html: markdownHTML }} />
      </Typography>
      {arraySimpleSelectors.map(renderElement)}
      {configElements.map(renderElement)}
      {simpleElements.map(renderElement)}
      {getNewDataGridElementIfAvailable()}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <MenuList>{dialogMenuListContent}</MenuList>
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default ObjectFieldExtendedTemplate;
