const INATO_BULLETS = [
  "Owned onboarding and implementation support across 20+ concurrent customer initiatives for pharmaceutical clients, driving adoption, accelerating time to value, and successful go-lives on our AI-powered clinical trial platform.",
  "Managed a portfolio of 8+ active enterprise customers, prioritizing engagement based on lifecycle stage, customer needs, and customer success indicators.",
  "Partnered with customers to understand business goals, workflows, and challenges, providing guidance and solution optimization to improve platform usage and outcomes.",
  "Delivered onboarding across global teams through live sessions and customer training to support consistent rollout.",
  "Monitored engagement and success metrics to identify risks and resolve issues, maintaining customer satisfaction and momentum.",
  "Improved internal project management processes to increase consistency and scalability; shared customer feedback with Product to inform improvements."
];

const MIKMAK_BULLETS = [
  "Owned a $2MM ARR portfolio across 60+ SMB and mid-market accounts, managing the full customer lifecycle from onboarding through renewal with a 93%+ retention rate.",
  "Built and launched scalable onboarding programs in WorkRamp, including self-service training and webinars, to drive product adoption across a high-volume customer base.",
  "Led business reviews using platform data to share insights, highlight performance, and identify opportunities to improve adoption and expand use cases.",
  "Delivered product training for both technical and non-technical stakeholders, increasing feature/platform adoption and reducing support ticket volume.",
  "Partnered with Product and Engineering to translate customer feedback and performance insights into actionable roadmap enhancements."
];

const ORIGINAL_SUMMARY = "Customer Success Leader with 8+ years of experience specializing in SaaS onboarding, platform implementations, and high-growth revenue management in fast-paced, startup environments. Guided SMB to enterprise clients from sales handoff through activation and go-live, building the foundation for adoption, time to value, and long-term value. Experienced in managing cross-functional teams and using customer insights to influence product roadmaps and scale implementations, while operating independently in ambiguous environments.";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jd, jobTitle, resume } = req.body;
  if (!jd) return res.status(400).json({ error: 'Missing job description' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Step 1: Ask AI ONLY for specific word substitutions — nothing else
  const substitutionPrompt = `You are a keyword analyst. Given a job description and a set of resume bullets, identify specific word or short phrase substitutions that would improve ATS keyword matching.

JD: ${jd.substring(0, 800)}
ROLE: ${jobTitle}

RESUME BULLETS TO ANALYZE:
${INATO_BULLETS.join('\n')}
${MIKMAK_BULLETS.join('\n')}

SUMMARY:
${ORIGINAL_SUMMARY}

Return a JSON array of substitutions. Each substitution must:
- Replace an exact substring that exists in the bullets above
- Replace it with a JD keyword that means the same thing or fits naturally
- Be minimal — swap one word or short phrase at a time
- Never change metrics, company names, or dates

Format: {"substitutions":[{"find":"exact text to find","replace":"replacement text","reason":"why this keyword matters"}],"scoreBefore":65,"scoreAfter":88,"missingKeywords":["keyword1"],"presentKeywords":["keyword2"],"topAtsPhrases":["phrase1"]}

Return 5-10 substitutions max. Raw JSON only, no markdown.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [
          { role: 'user', content: substitutionPrompt },
          { role: 'assistant', content: '{' }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const text = '{' + (data.content?.find(b => b.type === 'text')?.text || '');
    const lastBrace = text.lastIndexOf('}');
    const clean = text.substring(0, lastBrace + 1);

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: 'Parse error: ' + e.message + ' | ' + clean.substring(0, 200) });
    }

    // Step 2: Apply substitutions in code — AI never touches the original bullets directly
    let summary = ORIGINAL_SUMMARY;
    let inatoBullets = [...INATO_BULLETS];
    let mikmakBullets = [...MIKMAK_BULLETS];
    let keywordsAdded = 0;

    if (parsed.substitutions && Array.isArray(parsed.substitutions)) {
      for (const sub of parsed.substitutions) {
        if (!sub.find || !sub.replace) continue;
        // Apply to summary
        if (summary.includes(sub.find)) {
          summary = summary.replace(sub.find, sub.replace);
          keywordsAdded++;
        }
        // Apply to Inato bullets
        inatoBullets = inatoBullets.map(b => {
          if (b.includes(sub.find)) { keywordsAdded++; return b.replace(sub.find, sub.replace); }
          return b;
        });
        // Apply to MikMak bullets
        mikmakBullets = mikmakBullets.map(b => {
          if (b.includes(sub.find)) { keywordsAdded++; return b.replace(sub.find, sub.replace); }
          return b;
        });
      }
    }

    // Step 3: Reassemble the full resume with edited sections
    const optimizedResume = `PROFESSIONAL SUMMARY\n\n${summary}\n\nWORK EXPERIENCE\n\nInato\t Remote\nProject Manager, Customer Success\t     January 2024 – Present\n${inatoBullets.join('\n')}\n\nMikMak\t Remote\nCustomer Success Manager\t     October 2021 – February 2023\n${mikmakBullets.join('\n')}\n\nNexus Systems, Inc. (Acquired by Bottomline)\t   Remote\nCustomer Success Manager\tJanuary 2021 – October 2021\nManaged a portfolio of 100+ SMB and mid-market accounts, prioritizing engagement based on ARR, expansion potential, and account health.\nLed onboarding through webinars, training sessions, and standardized workflows to support high-volume customer activation and accelerate time to value.\nMonitored customer engagement and activity to identify at-risk accounts and drive targeted outreach to maintain retention and renewal readiness.\nPartnered with Sales to identify and support upsell opportunities across the portfolio, contributing to account growth.\n\nConvene\t New York, New York\nEvent Production Manager\tOctober 2017 – September 2020\nManaged 100+ concurrent corporate programs annually, balancing competing priorities, maintaining 95 NPS, and driving repeat business.\nOversaw $1MM+ in program budgets, optimizing operational efficiency while delivering complex, high-stakes outcomes for enterprise clients.\nCollaborated with Sales and Account Management to identify expansion opportunities, contributing to significant year-over-year account growth.\n\nInnerWorkings, Inc. \t New York, New York\nProject Coordinator\t      January 2017 – October 2017\nCoordinated large-scale marketing production projects, ensuring delivery within budget and timeline constraints.\nManaged vendor relationships and project tracking to support client retention and repeat business.\nDelivered consistent project execution, reinforcing long-term client relationships.\n\nEDUCATION\nUniversity of Massachusetts, Amherst\t    Amherst, MA\nIsenberg School of Management, Bachelor of Business Administration in Marketing\tMay 2016\nCollege of Social and Behavioral Sciences, Bachelor of Arts in Communications\n\nTOOLS\nSalesforce, HubSpot, Zendesk, Gong, WorkRamp, Amplitude, Notion, Figma, Customer.io, Looker Studio (Data & Reporting), Microsoft Office Suite`;

    return res.status(200).json({
      result: JSON.stringify({
        scoreBefore: parsed.scoreBefore || 60,
        scoreAfter: parsed.scoreAfter || 88,
        missingKeywords: parsed.missingKeywords || [],
        presentKeywords: parsed.presentKeywords || [],
        topAtsPhrases: parsed.topAtsPhrases || [],
        keywordsAdded,
        optimizedResume,
        substitutions: parsed.substitutions || []
      })
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
