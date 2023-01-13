import {
  Alert,
  AlertTitle,
  AppBar,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import FunixFunctionList from "./components/FunixFunctionList";
import FunixFunctionSelected from "./components/FunixFunctionSelected";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { getConfig } from "./shared";

const App = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(search);
  const backendStr = query.get("backend");
  const funixBackend: string | undefined = process.env.REACT_APP_FUNIX_BACKEND;
  const [backend, setBackend] = useState(backendStr || funixBackend);
  const [tempBackend, setTempBackend] = useState(backend);
  const [open, setOpen] = useState(false);

  const checkURL = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    getConfig()
      .then((data) => {
        if (data.backend === "__FLAG__") return;
        setBackend(data.backend);
        setTempBackend(data.backend);
      })
      .catch(() => {
        return;
      });
  }, []);

  return (
    <>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the URL of the backend server.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Backend URL"
            fullWidth
            variant="standard"
            onChange={(e) => setTempBackend(e.target.value)}
            value={tempBackend}
            error={!checkURL(tempBackend)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTempBackend(backend);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              navigate("/");
              setBackend(tempBackend);
              setOpen(false);
            }}
            disabled={!checkURL(tempBackend)}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ ml: 2, flex: 1 }}>
            Funix
          </Typography>
          <IconButton edge="end" color="inherit" onClick={() => setOpen(true)}>
            <Settings />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ paddingY: 2 }}>
        {backend ? (
          <Stack spacing={2}>
            <FunixFunctionList backend={new URL(backend)} />
            <FunixFunctionSelected backend={new URL(backend)} />
          </Stack>
        ) : (
          <Alert severity="error">
            <AlertTitle>No backend server</AlertTitle>
            <Stack direction="row" alignItems="center" gap={1}>
              Please use <code>python -m funix [module]</code> to start frontend
              server or click <Settings /> to set backend server.
            </Stack>
          </Alert>
        )}
      </Container>
    </>
  );
};

export default App;
