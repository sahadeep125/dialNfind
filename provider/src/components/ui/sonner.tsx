
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{ classNames: { toast: "!rounded-xl !border !shadow-[var(--shadow-lift)] !font-sans" } }}
      {...props}
    />
  );
}

export { Toaster };
