import { useEffect, useState } from 'react';

// In dev → calls localhost:4000
// In production build → VITE_API_URL is baked in by GitHub Actions from the secret
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const PUBLISH_STEPS = [
  'Saving to database',
  'Triggering GitHub Actions',
  'Building static site',
  'Deploying via FTP to Hostinger',
  'Live site updated',
];

export default function App() {
  const [surveys, setSurveys] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishState, setPublishState] = useState('idle'); // idle | publishing | done | error
  const [currentStep, setCurrentStep] = useState(0);
  const [lastPublished, setLastPublished] = useState(null);

  useEffect(() => {
    fetchSurveys();
  }, []);

  async function fetchSurveys() {
    const res = await fetch(`${API_URL}/api/surveys`);
    const data = await res.json();
    setSurveys(data);
  }

  async function handleAddSurvey(e) {
    e.preventDefault();
    if (!title.trim()) return;

    await fetch(`${API_URL}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });

    setTitle('');
    setDescription('');
    fetchSurveys();
  }

  async function handleDelete(id) {
    await fetch(`${API_URL}/api/surveys/${id}`, { method: 'DELETE' });
    fetchSurveys();
  }

  async function handlePublish() {
    setPublishState('publishing');
    setCurrentStep(0);

    // Step through the visual states while the backend does the real work.
    // The backend call and the visual timer run in parallel; the backend's
    // console logs show the same steps happening for real.
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < PUBLISH_STEPS.length - 2) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const res = await fetch(`${API_URL}/api/publish`, { method: 'POST' });
      const data = await res.json();
      clearInterval(stepTimer);
      setCurrentStep(PUBLISH_STEPS.length - 1);
      setLastPublished(data.publishedAt);
      setPublishState('done');
    } catch (err) {
      clearInterval(stepTimer);
      setPublishState('error');
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Survey CMS</h1>
        <p className="subtitle">React frontend &rarr; Node.js backend &rarr; Publish pipeline</p>
      </header>

      <section className="panel">
        <h2>Add a survey</h2>
        <form onSubmit={handleAddSurvey} className="form">
          <input
            type="text"
            placeholder="Survey title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <button type="submit">Add survey</button>
        </form>
      </section>

      <section className="panel">
        <h2>Surveys ({surveys.length})</h2>
        {surveys.length === 0 && <p className="empty">No surveys yet — add one above.</p>}
        <ul className="survey-list">
          {surveys.map((s) => (
            <li key={s.id} className="survey-item">
              <div>
                <strong>{s.title}</strong>
                {s.description && <p>{s.description}</p>}
              </div>
              <button className="delete-btn" onClick={() => handleDelete(s.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel publish-panel">
        <h2>Publish</h2>
        <p>
          Clicking Publish saves your changes to the database, then triggers the
          same build-and-deploy pipeline as a normal Git push.
        </p>
        <button
          className="publish-btn"
          onClick={handlePublish}
          disabled={publishState === 'publishing'}
        >
          {publishState === 'publishing' ? 'Publishing...' : 'Publish'}
        </button>

        {publishState !== 'idle' && (
          <ol className="steps">
            {PUBLISH_STEPS.map((step, i) => (
              <li
                key={step}
                className={
                  i < currentStep
                    ? 'step done'
                    : i === currentStep
                    ? 'step active'
                    : 'step'
                }
              >
                {step}
              </li>
            ))}
          </ol>
        )}

        {publishState === 'done' && (
          <p className="success">
            Published at {new Date(lastPublished).toLocaleTimeString()}
          </p>
        )}
        {publishState === 'error' && (
          <p className="error-msg">Publish failed — check the backend logs.</p>
        )}
      </section>
    </div>
  );
}
