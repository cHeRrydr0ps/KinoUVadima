import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import "./index.css";

// Suppress runtime-error-plugin errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      message.includes("Cannot read properties of undefined (reading 'frame')")) {
    return; // Suppress this specific error
  }
  originalConsoleError.apply(console, args);
};

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes("Cannot read properties of undefined (reading 'frame')")) {
    event.preventDefault(); // Prevent the error from being logged
    return;
  }
  if (event.reason?.message?.includes("Failed to fetch")) {
    console.warn("Network error suppressed:", event.reason);
    event.preventDefault(); // Prevent the error from being logged
    return;
  }
});

// Add global error handler for runtime errors
window.addEventListener('error', (event) => {
  if (event.message?.includes("Cannot read properties of undefined (reading 'frame')")) {
    event.preventDefault(); // Prevent the error from being logged
    return;
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);

