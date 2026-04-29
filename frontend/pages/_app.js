import "../styles/globals.css";
import AppLayout from "../components/AppLayout";
import { WalletProvider } from "../context/WalletContext";

export default function App({ Component, pageProps }) {
  return (
    <WalletProvider>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
    </WalletProvider>
  );
}
