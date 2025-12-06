import "semantic-ui-css/semantic.min.css";
import "../styles/globals.css";
import { Web3Provider } from "../context/Web3Context";

export default function App({ Component, pageProps }) {
  return (
    <Web3Provider>
      <Component {...pageProps} />
    </Web3Provider>
  );
}
