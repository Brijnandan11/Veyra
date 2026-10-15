const Icon = ({ children }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    {children}
  </svg>
);

const icons = {
  mail: (
    <Icon>
      <rect height="13" rx="2.5" width="17" x="3.5" y="5.5" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </Icon>
  ),
  chat: (
    <Icon>
      <path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z" />
    </Icon>
  ),
  webhook: (
    <Icon>
      <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 6.5l-3 11" />
    </Icon>
  ),
  globe: (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z" />
    </Icon>
  ),
  terminal: (
    <Icon>
      <rect height="14" rx="2.5" width="17" x="3.5" y="5" />
      <path d="m7.5 10 3 2.5-3 2.5M13 15h3.5" />
    </Icon>
  ),
  timeline: (
    <Icon>
      <path d="M7 4.5v15" />
      <circle cx="7" cy="7" r="1.6" />
      <circle cx="7" cy="12" r="1.6" />
      <circle cx="7" cy="17" r="1.6" />
      <path d="M11.5 7h6M11.5 12h4M11.5 17h5.5" />
    </Icon>
  ),
};

function Shell({ icon, tag, name, foot, children }) {
  return (
    <>
      <span className="face__head">
        <span className="face__icon">{icon}</span>
        <span className="face__tag">{tag}</span>
      </span>
      <span className="face__name">{name}</span>
      <span className="face__preview">{children}</span>
      <span className="face__foot">
        <span className="face__sample">
          <span className="face__sample-dot" />
          Sample
        </span>
        <span className="mono">{foot}</span>
      </span>
    </>
  );
}

const i = (n) => ({ "--i": n });

function EmailFace() {
  return (
    <Shell foot="14:02 UTC" icon={icons.mail} name="Email" tag="Alert">
      <span className="blk" style={i(0)}>
        <span className="blk__meta">Veyra alerts</span>
        <span className="blk__title">Payments gateway is failing</span>
        <span className="blk__text">Three checks in a row timed out, starting at 14:02 UTC.</span>
      </span>
      <span className="chip chip--bad" style={i(1)}>
        <span className="chip__dot" />
        Incident opened
      </span>
    </Shell>
  );
}

function SlackFace() {
  return (
    <Shell foot="#on-call" icon={icons.chat} name="Slack" tag="Alert">
      <span className="blk" style={i(0)}>
        <span className="blk__meta">
          Veyra <span className="mono">14:02</span>
        </span>
        <span className="blk__text">Payments gateway failing for 3 checks.</span>
      </span>
      <span className="btnrow" style={i(1)}>
        <span className="pill">Acknowledge</span>
        <span className="pill pill--ghost">View incident</span>
      </span>
    </Shell>
  );
}

function WebhookFace() {
  return (
    <Shell foot="POST" icon={icons.webhook} name="Webhooks" tag="Event">
      <span className="blk blk--code" style={i(0)}>
        <span className="mono">{'{\n  "event": "check.failed",\n  "monitor": "payments",\n  "status": 502\n}'}</span>
      </span>
    </Shell>
  );
}

function StatusFace() {
  return (
    <Shell foot="Public" icon={icons.globe} name="Public status page" tag="Customers">
      <span className="chip chip--bad" style={i(0)}>
        <span className="chip__dot" />
        Investigating
      </span>
      <span className="rows" style={i(1)}>
        <span className="rows__line">
          <span>Payments gateway</span>
          <span className="rows__bad">Down</span>
        </span>
        <span className="rows__line">
          <span>Public API</span>
          <span className="rows__ok">Up</span>
        </span>
        <span className="rows__line">
          <span>Docs</span>
          <span className="rows__ok">Up</span>
        </span>
      </span>
    </Shell>
  );
}

function ApiFace() {
  return (
    <Shell foot="200 OK" icon={icons.terminal} name="REST API" tag="Developers">
      <span className="blk blk--code" style={i(0)}>
        <span className="mono">{"GET /monitors\n\n200 OK\n{ \"count\": 4 }"}</span>
      </span>
      <span className="chip" style={i(1)}>
        Read results from code or CI
      </span>
    </Shell>
  );
}

function TimelineFace() {
  return (
    <Shell foot="Resolved" icon={icons.timeline} name="Incident timeline" tag="Evidence">
      <span className="steps">
        {[
          ["First failed check", "14:02"],
          ["Incident opened", "14:02"],
          ["Alert sent", "14:03"],
          ["Recovered", "14:11"],
        ].map(([label, time], n) => (
          <span className="step" key={label} style={i(n)}>
            <span className="step__dot" />
            <span className="step__label">{label}</span>
            <span className="mono step__time">{time}</span>
          </span>
        ))}
      </span>
    </Shell>
  );
}

export const alertChannels = [
  {
    id: "email",
    title: "Email",
    tone: "ultramarine",
    description: "A clear incident summary when a check changes state.",
    meta: [["Sent when", "A check changes state"]],
    face: EmailFace,
  },
  {
    id: "slack",
    title: "Slack",
    tone: "paper",
    description: "A focused signal for the room that is already watching.",
    meta: [["Lands in", "Your own channel"]],
    face: SlackFace,
  },
  {
    id: "webhooks",
    title: "Webhooks",
    tone: "forest",
    description: "A REST-ready event for your own workflow.",
    meta: [["Payload", "JSON event"]],
    face: WebhookFace,
  },
  {
    id: "status-page",
    title: "Public status page",
    tone: "saffron",
    description: "Share live health with customers on a page you do not have to maintain.",
    meta: [["Audience", "Your customers"]],
    face: StatusFace,
  },
  {
    id: "rest-api",
    title: "REST API",
    tone: "vermilion",
    description: "Create monitors and read results from your own code or CI.",
    meta: [["Built for", "Code and CI"]],
    face: ApiFace,
  },
  {
    id: "incidents",
    title: "Incident timeline",
    tone: "ink",
    description: "A timeline from the first failed check through recovery, kept as evidence.",
    meta: [["Starts at", "First failed check"]],
    face: TimelineFace,
  },
];

export function ChannelsStatic() {
  return (
    <div className="fan-static">
      {alertChannels.map(({ id, title, tone, face: Face }) => (
        <div aria-label={title} className="fan-card__face" data-tone={tone} key={id} role="group" style={{ width: 232, height: 325, fontSize: 14.5 }}>
          <Face active={false} />
        </div>
      ))}
    </div>
  );
}
