import ApprovalWorkspace from './components/ApprovalWorkspace';

export default function App() {
  return <ApprovalWorkspace clientMode={new URLSearchParams(window.location.search).has('client')} />;
}
