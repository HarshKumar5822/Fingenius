import { Toast, ToastProvider } from "@radix-ui/react-toast"

export function Toaster() {
  return (
    <ToastProvider>
      <Toast />
    </ToastProvider>
  )
}

export { Toast } 