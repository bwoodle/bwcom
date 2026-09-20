import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Header,
  SegmentedControl,
  SpaceBetween,
  Spinner,
  StatusIndicator,
} from "@cloudscape-design/components";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import MediaBulkEditor from "../components/MediaBulkEditor";
import TrainingLogBulkEditor from "../components/TrainingLogBulkEditor";
import {
  clearAdminToken,
  fetchAdminSession,
  setAdminToken,
} from "../lib/admin-auth";

type AdminUser = {
  email: string;
  name: string;
};

const AdminPage: React.FC = () => {
  const [mode, setMode] = useState<"training-log" | "media">("training-log");
  const [sessionStatus, setSessionStatus] = useState<"checking" | "signed-out" | "signed-in">("checking");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const currentUser = await fetchAdminSession();
        setUser(currentUser);
        setSessionStatus("signed-in");
        setSessionError(null);
      } catch {
        clearAdminToken();
        setUser(null);
        setSessionStatus("signed-out");
      }
    }

    void checkSession();
  }, []);

  const onSignOut = () => {
    clearAdminToken();
    googleLogout();
    setUser(null);
    setSessionError(null);
    setSessionStatus("signed-out");
  };

  const onGoogleCredential = async (credential: string | undefined) => {
    if (!credential) {
      setSessionError("Google sign-in did not return a valid token.");
      return;
    }

    setSessionStatus("checking");
    setSessionError(null);

    try {
      setAdminToken(credential);
      const currentUser = await fetchAdminSession();
      setUser(currentUser);
      setSessionStatus("signed-in");
    } catch {
      clearAdminToken();
      setUser(null);
      setSessionStatus("signed-out");
      setSessionError("Your account is not authorized for admin access.");
    }
  };

  if (sessionStatus === "checking") {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <Container header={<Header variant="h1">Admin</Header>}>
          <Box textAlign="center" padding={{ vertical: "xxl" }}>
            <Spinner size="large" />
            <Box margin={{ top: "s" }}>Checking admin session...</Box>
          </Box>
        </Container>
      </div>
    );
  }

  if (sessionStatus !== "signed-in") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <Container header={<Header variant="h1">Admin Sign In</Header>}>
          <SpaceBetween size="m">
            <Box>
              Sign in with Google using an approved admin account to access media and training log editing.
            </Box>
            <GoogleLogin
              onSuccess={({ credential }) => {
                void onGoogleCredential(credential);
              }}
              onError={() => setSessionError("Google sign-in failed.")}
              text="signin_with"
              shape="rectangular"
            />
            {sessionError ? (
              <StatusIndicator type="error">{sessionError}</StatusIndicator>
            ) : null}
          </SpaceBetween>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <SpaceBetween size="l">
        <Container
          header={
            <Header
              variant="h1"
              actions={
                <Button onClick={onSignOut}>
                  Sign out
                </Button>
              }
            >
              Admin
            </Header>
          }
        >
          <Box margin={{ bottom: "s" }} color="text-body-secondary">
            Signed in as {user?.name || user?.email}
          </Box>
          <SegmentedControl
            selectedId={mode}
            onChange={({ detail }) =>
              setMode(detail.selectedId as "training-log" | "media")
            }
            options={[
              { id: "training-log", text: "Training Log" },
              { id: "media", text: "Media" },
            ]}
          />
        </Container>
        {mode === "training-log" ? <TrainingLogBulkEditor /> : null}
        {mode === "media" ? <MediaBulkEditor /> : null}
      </SpaceBetween>
    </div>
  );
};

export default AdminPage;
