/*
  # Repository Analysis Edge Function

  1. New Edge Function
    - `analyze-repository` function for GitHub and AI analysis
    - Integrates with GitHub API for commit analysis
    - Uses Gemini AI for intelligent repository assessment
    - Validates hackathon eligibility based on creation date

  2. Security
    - Uses environment variables for API keys
    - Handles CORS properly
    - Validates input parameters

  3. Features
    - Real GitHub commit analysis
    - Verified commit detection
    - Rapid commit pattern analysis
    - AI-powered repository assessment
    - Hackathon eligibility validation
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      date: string;
    };
    message: string;
    verification: {
      verified: boolean;
      reason: string;
    };
  };
  author: {
    login: string;
  } | null;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

interface GitHubRepo {
  created_at: string;
  updated_at: string;
  language: string;
  size: number;
  default_branch: string;
  full_name: string;
}

interface AnalysisResult {
  repoUrl: string;
  verificationPercentage: number;
  isLikelyAIGenerated: boolean;
  isEligible: boolean;
  hasBoltNewBadge: boolean;
  commitPatterns: {
    rapidCommits: number;
    filePatterns: string[];
    timePatterns: string[];
    verifiedCommits: number;
    totalCommits: number;
  };
  confidence: 'low' | 'medium' | 'high';
  details: string[];
  aiAnalysis?: {
    summary: string;
    likelihood: number;
    keyFindings: string[];
    recommendations: string[];
    confidence: string;
  };
  eligibilityReason?: string;
}

async function checkBoltNewBadge(owner: string, repo: string, githubToken: string): Promise<boolean> {
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Bolt-Detector/1.0'
  };

  try {
    // Try to fetch src/App.tsx file content
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/src/App.tsx`, { 
      headers,
      method: 'GET'
    });
    
    if (!fileResponse.ok) {
      // If src/App.tsx doesn't exist, try other common React entry points
      const alternativeFiles = ['src/App.js', 'src/app.tsx', 'src/app.js', 'App.tsx', 'App.js'];
      
      for (const altFile of alternativeFiles) {
        const altResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${altFile}`, { 
          headers,
          method: 'GET'
        });
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData.content) {
            const decodedContent = atob(altData.content);
            return decodedContent.toLowerCase().includes('bolt.new');
          }
        }
      }
      
      return false; // No app file found
    }
    
    const fileData = await fileResponse.json();
    
    if (!fileData.content) {
      return false; // No content in file
    }
    
    // Decode base64 content
    const decodedContent = atob(fileData.content);
    
    // Check if "bolt.new" is mentioned in the file content
    return decodedContent.toLowerCase().includes('bolt.new');
    
  } catch (error) {
    console.error('Error checking bolt.new badge:', error);
    return false; // Assume no badge if there's an error
  }
}

async function fetchGitHubData(owner: string, repo: string, githubToken: string) {
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Bolt-Detector/1.0'
  };

  try {
    // Fetch repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { 
      headers,
      method: 'GET'
    });
    
    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      throw new Error(`GitHub API error (${repoResponse.status}): ${errorText}`);
    }
    
    const repoData: GitHubRepo = await repoResponse.json();

    // Fetch commits (last 200 commits, or all available if fewer)
    const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=200`, { 
      headers,
      method: 'GET'
    });
    
    if (!commitsResponse.ok) {
      const errorText = await commitsResponse.text();
      throw new Error(`GitHub commits API error (${commitsResponse.status}): ${errorText}`);
    }
    
    const commits: GitHubCommit[] = await commitsResponse.json();

    return { repoData, commits };
  } catch (error) {
    console.error('GitHub API fetch error:', error);
    throw new Error(`Failed to fetch GitHub data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function analyzeCommitPatterns(commits: GitHubCommit[]) {
  const verifiedCommits = commits.filter(commit => commit.commit.verification.verified).length;
  const totalCommits = commits.length;
  const githubVerifiedPercentage = totalCommits > 0 ? Math.round((verifiedCommits / totalCommits) * 100) : 0;

  // Analyze rapid commits (commits within short time intervals)
  const commitTimes = commits.map(commit => new Date(commit.commit.author.date).getTime());
  commitTimes.sort((a, b) => a - b);
  
  let rapidCommits = 0;
  const rapidThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (let i = 1; i < commitTimes.length; i++) {
    if (commitTimes[i] - commitTimes[i - 1] < rapidThreshold) {
      rapidCommits++;
    }
  }

  // Analyze file patterns
  const filePatterns: string[] = [];
  const packageJsonCommits = commits.filter(commit => 
    commit.commit.message.toLowerCase().includes('package.json') ||
    commit.commit.message.toLowerCase().includes('dependencies')
  ).length;
  
  if (packageJsonCommits > 0) {
    filePatterns.push('Package.json modifications detected');
  }
  
  if (rapidCommits > 5) {
    filePatterns.push('Multiple rapid file changes');
  }
  
  if (githubVerifiedPercentage > 70) {
    filePatterns.push('High GitHub verification rate pattern');
  }

  // Analyze time patterns
  const timePatterns: string[] = [];
  if (rapidCommits > 10) {
    timePatterns.push('Frequent rapid commits detected');
  }
  
  const commitHours = commits.map(commit => new Date(commit.commit.author.date).getHours());
  const nightCommits = commitHours.filter(hour => hour >= 22 || hour <= 6).length;
  if (nightCommits > totalCommits * 0.3) {
    timePatterns.push('Unusual late-night development patterns');
  }

  return {
    rapidCommits,
    filePatterns,
    timePatterns,
    verifiedCommits,
    totalCommits,
    githubVerifiedPercentage
  };
}

async function analyzeWithGemini(repoData: GitHubRepo, commits: GitHubCommit[], patterns: any, geminiApiKey: string) {
  const commitMessages = commits.slice(0, 15).map(c => c.commit.message).join('\n- ');
  
  const prompt = `You are an expert code analyst. Analyze this GitHub repository for AI-generated patterns and return ONLY a valid JSON object with this exact structure:

{
  "summary": "A clear 2-3 sentence summary of your analysis",
  "likelihood": 65,
  "keyFindings": [
    "Finding 1 about verification patterns",
    "Finding 2 about commit behavior", 
    "Finding 3 about development patterns"
  ],
  "recommendations": [
    "Recommendation 1 for verification",
    "Recommendation 2 for compliance"
  ],
  "confidence": "high"
}

Repository Data:
- Created: ${repoData.created_at}
- Language: ${repoData.language || 'Unknown'}
- Size: ${repoData.size} KB
- Total commits: ${patterns.totalCommits}
- GitHub verified commits: ${patterns.verifiedCommits} (${patterns.githubVerifiedPercentage}%)
- Rapid commits: ${patterns.rapidCommits}

Recent commit messages:
- ${commitMessages}

Analysis Guidelines:
- Consider GitHub verification as ONE factor among many (cryptographic signing, not AI indicator)
- Rapid commits (${patterns.rapidCommits}) indicate automated development
- Look for patterns in commit messages and timing
- Consider repository age and development velocity
- Look for generic commit messages, file creation patterns, and development velocity
- Base likelihood on OVERALL analysis, not just GitHub verification
- Confidence should reflect certainty of your analysis based on ALL factors

Return ONLY the JSON object, no markdown formatting or additional text.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error('No response from Gemini AI');
    }

    // Clean and parse the JSON response
    let cleanedText = aiText.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*|\s*```/g, '');
    
    // Find JSON object boundaries
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }

    try {
      const parsedAnalysis = JSON.parse(cleanedText);
      
      // Validate required fields and structure
      const requiredFields = ['summary', 'likelihood', 'keyFindings', 'recommendations', 'confidence'];
      const hasAllFields = requiredFields.every(field => parsedAnalysis.hasOwnProperty(field));
      
      if (!hasAllFields) {
        throw new Error('Missing required fields in AI response');
      }

      // Ensure arrays are actually arrays
      if (!Array.isArray(parsedAnalysis.keyFindings)) {
        parsedAnalysis.keyFindings = [String(parsedAnalysis.keyFindings)];
      }
      
      if (!Array.isArray(parsedAnalysis.recommendations)) {
        parsedAnalysis.recommendations = [String(parsedAnalysis.recommendations)];
      }

      // Ensure likelihood is a number
      if (typeof parsedAnalysis.likelihood !== 'number') {
        parsedAnalysis.likelihood = parseInt(String(parsedAnalysis.likelihood)) || Math.min(patterns.githubVerifiedPercentage + patterns.rapidCommits, 100);
      }

      // Validate confidence level
      if (!['high', 'medium', 'low'].includes(parsedAnalysis.confidence)) {
        parsedAnalysis.confidence = parsedAnalysis.likelihood > 80 ? 'high' : 
                                   parsedAnalysis.likelihood > 60 ? 'medium' : 'low';
      }

      return parsedAnalysis;
      
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw AI response:', aiText);
      throw new Error('Failed to parse AI response as JSON');
    }

  } catch (error) {
    console.error('Gemini analysis failed:', error);
    
    // Return structured fallback analysis
    return {
      summary: `Analysis based on ${patterns.totalCommits} commits with ${patterns.githubVerifiedPercentage}% GitHub verification rate. Rapid commits: ${patterns.rapidCommits}. Development patterns suggest ${patterns.rapidCommits > 10 ? 'automated' : 'manual'} code generation.`,
      likelihood: Math.min(patterns.githubVerifiedPercentage * 0.3 + patterns.rapidCommits * 2 + (patterns.totalCommits > 50 ? 10 : 0), 100),
      keyFindings: [
        `GitHub verification rate: ${patterns.githubVerifiedPercentage}% (${patterns.verifiedCommits}/${patterns.totalCommits} commits)`,
        `Rapid commit sequences: ${patterns.rapidCommits} detected`,
        patterns.rapidCommits > 10 ? 'High automation suggests AI-assisted development' : 'Development patterns suggest human involvement',
        `Repository created: ${new Date(repoData.created_at).toDateString()}`
      ],
      recommendations: [
        patterns.rapidCommits > 10 ? 'Manual code review recommended for hackathon compliance' : 'Development patterns appear normal',
        'Consider reviewing commit history for development timeline',
        'Validate that primary development occurred within hackathon timeframe'
      ],
      confidence: patterns.rapidCommits > 15 ? 'high' : patterns.rapidCommits > 7 ? 'medium' : 'low'
    };
  }
}

function checkHackathonEligibility(repoData: GitHubRepo) {
  const createdDate = new Date(repoData.created_at);
  const hackathonStartDate = new Date('2025-05-31T00:00:00.000Z'); // May 31, 2025
  
  if (createdDate < hackathonStartDate) {
    return {
      isEligible: false,
      reason: `Repository created on ${createdDate.toDateString()}, before hackathon start date (May 31, 2025)`
    };
  }
  
  return {
    isEligible: true,
    reason: `Repository created on ${createdDate.toDateString()}, from/after hackathon start date (May 31, 2025)`
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoUrl } = await req.json();
    
    if (!repoUrl) {
      return new Response(
        JSON.stringify({ error: 'Repository URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse GitHub URL
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid GitHub URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [, owner, repo] = urlMatch;
    const cleanRepo = repo.replace(/\.git$/, '');

    // Get API keys from environment
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!githubToken || !geminiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'API keys not configured',
          details: 'GITHUB_TOKEN and GEMINI_API_KEY environment variables are required'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch GitHub data
    const { repoData, commits } = await fetchGitHubData(owner, cleanRepo, githubToken);

    // Check hackathon eligibility
    const eligibility = checkHackathonEligibility(repoData);

    // Analyze commit patterns
    const patterns = analyzeCommitPatterns(commits);

    // Check for bolt.new badge in repository files
    const hasBoltNewBadge = await checkBoltNewBadge(owner, cleanRepo, githubToken);

    // Get AI analysis
    const aiAnalysis = await analyzeWithGemini(repoData, commits, patterns, geminiApiKey);

    // Determine if likely AI generated based on AI analysis
    const isLikelyAIGenerated = aiAnalysis.likelihood > 70;

    // Use AI analysis confidence
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (aiAnalysis.likelihood > 80) {
      confidence = 'high';
    } else if (aiAnalysis.likelihood > 60) {
      confidence = 'medium';
    }

    // Build analysis details
    const details = [
      `Repository analyzed: ${patterns.totalCommits} total commits`,
      `GitHub verified commits: ${patterns.verifiedCommits} (${patterns.githubVerifiedPercentage}%)`,
      `Rapid commit sequences: ${patterns.rapidCommits}`,
      `AI likelihood assessment: ${aiAnalysis.likelihood}%`,
      `Bolt.new badge ${hasBoltNewBadge ? 'detected' : 'not found'} in source code`,
      `Repository created: ${new Date(repoData.created_at).toDateString()}`,
      eligibility.reason
    ];

    if (!eligibility.isEligible) {
      details.unshift('⚠️ Repository not eligible for hackathon');
    }

    const result: AnalysisResult = {
      repoUrl,
      verificationPercentage: aiAnalysis.likelihood,
      isLikelyAIGenerated,
      isEligible: eligibility.isEligible,
      hasBoltNewBadge,
      commitPatterns: patterns,
      confidence: aiAnalysis.confidence,
      details,
      aiAnalysis,
      eligibilityReason: eligibility.reason
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});