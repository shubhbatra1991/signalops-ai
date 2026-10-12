export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <div className="page-heading">
        <div>
          <p className="eyebrow">APPLICATION PREVIEW</p>
          <h1>Loading section</h1>
          <p className="page-description">Preparing this section of your workspace.</p>
        </div>
      </div>
      <div className="empty-panel">
        <p>The application navigation and appearance controls are still available.</p>
      </div>
    </div>
  );
}
