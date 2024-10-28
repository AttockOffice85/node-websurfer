const apiUrl: string | undefined = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  throw new Error("API URL is not defined");
}

interface LogResponse {
  logData: string;
  timestamp: string;
  status: string;
}

interface LogError {
  message: string;
  statusCode: number;
}

export const LogsClient = {
  /* -------------------------------------------------------------------------------------------- */
  /*                                        Fetch User Logs                                       */
  /* -------------------------------------------------------------------------------------------- */

  fetchUserLogs: async (username: string): Promise<LogResponse> => {
    const response = await fetch(`${apiUrl}/logs/${username}`);

    if (!response.ok) {
      const errorData: LogError = await response.json();
      throw new Error(errorData.message || "Failed to fetch logs");
    }

    const logData = await response.text();

    return {
      logData,
      timestamp: new Date().toISOString(),
      status: "success",
    };
  },

  /* -------------------------------------------------------------------------------------------- */
  /*                                      Clear User Logs                                         */
  /* -------------------------------------------------------------------------------------------- */

  clearLogs: async (username: string): Promise<LogResponse> => {
    try {
      const response = await fetch(`${apiUrl}/logs/${username}/clear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to clear logs");
      }

      return {
        logData: "",
        timestamp: new Date().toISOString(),
        status: "cleared",
      };
    } catch (error) {
      console.error("Error clearing logs:", error);
      throw error;
    }
  },

  /* -------------------------------------------------------------------------------------------- */
  /*                                     Download User Logs                                       */
  /* -------------------------------------------------------------------------------------------- */

  downloadLogs: async (username: string): Promise<Blob> => {
    const response = await fetch(`${apiUrl}/logs/${username}/download`);

    if (!response.ok) {
      throw new Error("Failed to download logs");
    }

    return await response.blob();
  },
};
