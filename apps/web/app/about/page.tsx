export default function AboutPage() {
  return (
    <main className="card">
      <h1 style={{ marginTop: 0 }}>About ArcMeter</h1>
      <p className="small">
        This dashboard drives a live x402 HTTP 402 paywall demo.
        It calls:
      </p>
      <div className="small">
        <div>Seller API: /signal (402 issuance, proof verification, receipts)</div>
        <div>Facilitator: /verify + /settle (local demo verifier or upstream proxy)</div>
        <div>Agent Buyer: /run (handles 402, decides, pays, retries)</div>
      </div>
    </main>
  );
}
