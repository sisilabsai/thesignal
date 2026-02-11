Business Plan: Project "The Signal"
Subtitle: Restoring the Human Premium to the Global Web
Date: February 11, 2026
Founder's Draft

1. Executive Summary
The internet has reached a tipping point. Automated content now overwhelms human work, and users can no longer tell real recommendations from bot-driven campaigns. The Signal is a human trust layer for the web: a provenance protocol, creator tooling, and distribution system that verifies human-authored content and makes it easy to find, rank, and license. We will lead with integrations and overlays on existing platforms, then graduate to a premium human-first search experience once index density is high.

2. The Problem (The Synthetic Flood)
- Search quality collapse: AI-SEO content saturates results with low signal and repetitive answers.
- Career erosion: Human experts are buried under volume, making it harder to earn or be discovered.
- Trust collapse: Users cannot distinguish genuine human judgment from automated persuasion.

3. The Solution: The Signal Trust Layer
The Signal is not only a destination site. It is a three-tier system designed for distribution-first adoption.

I. The Trust Layer (Protocol + Proof)
- A cryptographic provenance record for content with privacy-preserving proofs of human authorship.
- Labels instead of absolutes: Human-Authored, Human-Guided, Machine-Generated.
- Open, auditable specs for attestation and scoring inputs.

II. The Distribution Layer (Where Users Encounter It)
- Browser extension overlays Human Labels and Humanity Scores on Google, YouTube, X, Reddit, GitHub, and news sites.
- CMS and IDE plugins (WordPress, Ghost, Substack, VS Code, JetBrains) to sign content at creation.
- Embeddable "Human-only" feeds publishers can add to raise trust and retention.

III. The Discovery Layer (Premium Surface)
- A human-only search experience that becomes valuable once the index is dense and trusted.
- A neutral consumer interface showcasing the best verified work.

4. Verification Model (Clear, Realistic, Privacy-Preserving)
- Definition: "Human-Authored" means a human initiated and materially authored the work. AI assistance is allowed when disclosed under Human-Guided.
- Attestation: device-bound signing keys + zero-knowledge proofs of human presence without identity leakage.
- Provenance: C2PA-compatible content manifests with tamper-evident timestamps.
- Accessibility: compliant with assistive tools and alternative input methods.

5. Incentives and Network Effects
- Distribution wins: verified content receives preferred placement in partner feeds and overlays.
- Licensing marketplace: verified human content can be syndicated and paid for with provenance.
- Trust premiums: publishers and platforms improve retention and credibility with Signal overlays.

6. Threats and Mitigations
- Sybil farms and delegation: device binding, rate limits, and behavior anomaly detection.
- Content laundering: provenance trails and challenge/appeal workflows.
- Key theft or replay: hardware-backed attestation (Secure Enclave / StrongBox) and key rotation.
- Adversarial AI editing: label requirements and dispute resolution.

7. Governance and Transparency
- Open spec for proof format and scoring inputs.
- Independent audits of verification and fraud rates.
- Public transparency dashboard: false positives, disputes, and enforcement outcomes.

8. Market Sizing (TAM/SAM/SOM)
- Sources: Grand View Research identity verification and content moderation market reports; MarketsandMarkets as a secondary cross-check for identity verification.
- TAM (global, 2030): identity verification $33.93B + content moderation services $22.78B = $56.71B.
- TAM (2026 planning estimate, derived from published CAGRs): identity verification ~ $18.3B and content moderation ~ $14.1B, combined ~ $32.4B.
- SAM (global software-solution spend, 2030): apply solution shares (identity verification solutions >71%; content moderation solutions ~59%) => ~ $37.5B.
- SOM (3 to 5 year target, assumption): 1% of SAM = ~ $0.38B ARR.
- Cross-check: MarketsandMarkets estimates identity verification at $10.9B in 2023 growing to $21.8B by 2028 (directionally consistent).
- Early adopters: journalists, researchers, developers, and "human-first" communities.
- The human premium: verified content earns higher trust, better distribution, and higher licensing value.

9. Revenue and Business Model (Sequenced)
- Enterprise API: organizations pay for verified human indexes, compliance, and trust scoring.
- Platform partnerships: paid integrations and revenue-sharing for verified content distribution.
- Sponsored placements (non-tracking): only for verified content in context-based surfaces.
- Creator subscriptions (later): premium analytics and distribution features after proven upside.

10. Technical Stack
- Identity and proofs: ZK-STARKs via zkVerify or RISC Zero.
- Provenance standard: C2PA integration and signed manifests.
- Indexing: vector-optimized search (Qdrant or Pinecone) for human-to-human discovery.
- Security: multi-signature hardware attestation and fraud monitoring.

11. Strategic Roadmap
- Phase 1 (Q2 2026): Browser extension + CMS/IDE signing plugins; seed 100,000 verified sources.
- Phase 2 (Q3 2026): Enterprise API, platform partnerships, and licensing marketplace.
- Phase 3 (Q4 2026): Launch premium human-only search experience with trusted density.

12. The Human-First Manifesto
"We believe the internet was built to connect people, not to train models. We reject the era of the anonymous bot. We value the messy, the unpredictable, and the authentic. If a human didn't think it, it doesn't belong on The Signal."

This plan shifts the web from quantity to quality. In an era of infinite cheap content, verified human origin becomes the most valuable signal online.

Appendix A: Go-To-Market (One Page)
- Positioning: The Signal is a human trust layer and label system, not a new destination site first.
- Wedge products: browser extension overlays + CMS/IDE signing plugins that add value without switching tools.
- Primary users: creators and readers who want verified human content.
- Primary buyers: platforms, publishers, and enterprises that need trust, provenance, and compliance.
- Partner targets (CMS/newsletters): WordPress.com/Automattic, Ghost, Substack, Medium, Beehiiv.
- Partner targets (developer platforms): GitHub, Stack Overflow, DEV, Hashnode.
- Partner targets (provenance standards): C2PA and the Content Authenticity Initiative.
- Distribution channels: Chrome Web Store, Firefox Add-ons, Microsoft Edge Add-ons, Product Hunt, Hacker News, GitHub.
- Launch channels: creator newsletters, journalism associations, developer conferences, and direct outreach to platform trust teams.
- Growth loop: verified content -> overlay visibility -> creator sign-ups -> more verified content -> better search density.
- KPI targets: verified sources, signed items per day, extension installs, D30 retention, enterprise pilots.
