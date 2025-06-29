import React, { useState } from 'react';
import { Github, Zap, AlertTriangle, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase';

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

// Custom CSS for the Bolt.new badge
const badgeStyles = `
  .bolt-badge {
    transition: all 0.3s ease;
  }
  @keyframes badgeIntro {
    0% { transform: rotateY(-90deg); opacity: 0; }
    100% { transform: rotateY(0deg); opacity: 1; }
  }
  .bolt-badge-intro {
    animation: badgeIntro 0.8s ease-out 1s both;
  }
  .bolt-badge-intro.animated {
    animation: none;
  }
  @keyframes badgeHover {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(22deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  .bolt-badge:hover {
    animation: badgeHover 0.6s ease-in-out;
  }
`;

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeRepository = async () => {
    if (!repoUrl.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-repository', {
        body: { repoUrl }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Analysis failed');
      }

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      setResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Analysis error:', err);
    }

    setIsAnalyzing(false);
  };

  const getVerificationColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-600';
    if (percentage > 60) return 'text-orange-400';
    return 'text-gray-500';
  };

  const getVerificationBg = (percentage: number) => {
    if (percentage > 80) return 'bg-red-600';
    if (percentage > 60) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 text-black dark:text-white transition-colors duration-300">
      {/* Inject Badge Styles */}
      <style>{badgeStyles}</style>

      {/* Custom Bolt.new Badge */}
      <div className="fixed top-4 right-4 z-50">
        <a href="https://bolt.new" target="_blank" rel="noopener noreferrer" 
           className="block transition-all duration-300 hover:shadow-2xl">
          <img src="https://storage.bolt.army/white_circle_360x360.png" 
               alt="Built with Bolt.new badge" 
               className="w-20 h-20 md:w-28 md:h-28 rounded-full shadow-lg bolt-badge bolt-badge-intro"
               onAnimationEnd={(e) => e.currentTarget.classList.add('animated')} />
        </a>
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-gray-900 dark:text-white transition-colors duration-300">Bolt.new Detector</h1>
              <p className="text-gray-500 dark:text-gray-400 font-light transition-colors duration-300">Verify if projects were built with bolt.new for World's Largest Hackathon</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 mb-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl transition-colors duration-300">
              <Github className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-colors duration-300" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white transition-colors duration-300">Repository Analysis</h2>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 font-light transition-all duration-300"
                disabled={isAnalyzing}
              />
            </div>
            <button
              onClick={analyzeRepository}
              disabled={isAnalyzing || !repoUrl.trim()}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-2xl font-medium transition-all duration-300 flex items-center space-x-3 text-white shadow-lg hover:shadow-xl"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 mb-8 transition-colors duration-300">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl transition-colors duration-300">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 transition-colors duration-300" />
              </div>
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-400 mb-2 transition-colors duration-300">Analysis Error</h4>
                <p className="text-red-600 dark:text-red-300 text-sm font-light transition-colors duration-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Eligibility Check */}
            {!result.isEligible && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 transition-colors duration-300">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl transition-colors duration-300">
                    <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 transition-colors duration-300" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-400 mb-2 transition-colors duration-300">Hackathon Ineligible</h4>
                    <p className="text-red-600 dark:text-red-300 text-sm font-light transition-colors duration-300">{result.eligibilityReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-light text-gray-900 dark:text-white transition-colors duration-300">Verification Results</h3>
                <a
                  href={result.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-2 text-sm font-light transition-colors duration-300"
                >
                  <span>View Repository</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Main Verification Display */}
              <div className="mb-8">
                <div className="flex items-center space-x-6 mb-4">
                  <div className={`text-4xl font-light ${getVerificationColor(result.verificationPercentage)} transition-colors duration-300`}>
                    {result.verificationPercentage}%
                  </div>
                  <div>
                    <div className="text-xl font-medium text-gray-900 dark:text-white transition-colors duration-300">Bolt.new Generated</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">Verification Confidence: {result.confidence}</div>
                  </div>
                  {result.verificationPercentage > 80 && (
                    <div className="animate-pulse">
                      <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6 transition-colors duration-300">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${getVerificationBg(result.verificationPercentage)}`}
                    style={{ width: `${result.verificationPercentage}%` }}
                  ></div>
                </div>

                {/* AI Generated Indicator */}
                {result.isLikelyAIGenerated && (
                  <div className="flex items-center space-x-3 text-orange-500 dark:text-orange-400 transition-colors duration-300">
                    <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl transition-colors duration-300">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Likely AI Generated</span>
                  </div>
                )}
              </div>

              {/* High Verification Alert */}
              {result.aiAnalysis && result.aiAnalysis.likelihood > 80 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-6 mb-6 transition-colors duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl transition-colors duration-300">
                      <AlertTriangle className="h-5 w-5 text-orange-500 dark:text-orange-400 transition-colors duration-300" />
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-800 dark:text-orange-400 mb-2 transition-colors duration-300">High Verification Alert</h4>
                      <p className="text-orange-600 dark:text-orange-300 text-sm font-light transition-colors duration-300">
                        This repository shows an AI likelihood above 80%, which strongly indicates AI-assisted development.
                        Human developers typically show more varied development patterns and different commit behaviors.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Commit Patterns */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
                <h4 className="text-xl font-medium mb-6 flex items-center space-x-3 text-gray-900 dark:text-white transition-colors duration-300">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl transition-colors duration-300">
                    <CheckCircle className="h-5 w-5 text-gray-500 dark:text-gray-400 transition-colors duration-300" />
                  </div>
                  <span>Commit Patterns</span>
                </h4>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors duration-300">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-light mb-1 transition-colors duration-300">Rapid Commits Detected</div>
                    <div className="text-2xl font-light text-gray-900 dark:text-white transition-colors duration-300">{result.commitPatterns.rapidCommits}</div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors duration-300">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-light mb-1 transition-colors duration-300">Total Commits Analyzed</div>
                    <div className="text-2xl font-light text-gray-900 dark:text-white transition-colors duration-300">{result.commitPatterns.totalCommits}</div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors duration-300">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-light mb-1 transition-colors duration-300">Verified Commits</div>
                    <div className="text-2xl font-light text-gray-900 dark:text-white transition-colors duration-300">{result.commitPatterns.verifiedCommits}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-light mb-3 transition-colors duration-300">File Patterns</div>
                    <div className="space-y-2">
                      {result.commitPatterns.filePatterns.map((pattern, index) => (
                        <div key={index} className="text-sm bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 font-light transition-colors duration-300">
                          {pattern}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Details */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
                <h4 className="text-xl font-medium mb-6 text-gray-900 dark:text-white transition-colors duration-300">Analysis Report</h4>
                
                {result.aiAnalysis && result.aiAnalysis.likelihood > 80 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3 mb-6 transition-colors duration-300">
                    <div className="text-red-600 dark:text-red-400 font-medium text-sm transition-colors duration-300">AUTOMATIC DETECTION</div>
                    <div className="text-red-500 dark:text-red-300 text-sm font-light transition-colors duration-300">High AI likelihood indicates automated generation</div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {result.details.map((detail, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start space-x-3 font-light transition-colors duration-300">
                      <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Analysis - Enhanced Visual Display */}
              {result.aiAnalysis && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 lg:col-span-2 transition-colors duration-300">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-medium text-gray-900 dark:text-white transition-colors duration-300">AI Analysis</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">Powered by Gemini AI</p>
                    </div>
                    <div className="ml-auto">
                      <div className="bg-red-100 dark:bg-red-500/20 px-4 py-2 rounded-2xl transition-colors duration-300">
                        <span className="text-red-700 dark:text-red-300 text-sm font-medium transition-colors duration-300">
                          {result.aiAnalysis.likelihood}% AI Likelihood
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-8">
                    <div className="bg-white/70 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 transition-colors duration-300">
                      <h5 className="text-red-700 dark:text-red-400 font-medium mb-3 flex items-center space-x-3 transition-colors duration-300">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Executive Summary</span>
                      </h5>
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-light transition-colors duration-300">{result.aiAnalysis.summary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Key Findings */}
                    <div className="bg-white/70 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 transition-colors duration-300">
                      <h5 className="text-red-700 dark:text-red-400 font-medium mb-4 flex items-center space-x-3 transition-colors duration-300">
                        <CheckCircle className="h-5 w-5" />
                        <span>Key Findings</span>
                      </h5>
                      <div className="space-y-3">
                        {result.aiAnalysis.keyFindings.map((finding, index) => (
                          <div key={index} className="flex items-start space-x-3 group">
                            <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0 group-hover:bg-red-500 transition-colors duration-300"></div>
                            <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-700 dark:group-hover:text-gray-200 font-light transition-colors duration-300">{finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white/70 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 transition-colors duration-300">
                      <h5 className="text-red-700 dark:text-red-400 font-medium mb-4 flex items-center space-x-3 transition-colors duration-300">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Recommendations</span>
                      </h5>
                      <div className="space-y-3">
                        {result.aiAnalysis.recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start space-x-3 group">
                            <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0 group-hover:bg-red-500 transition-colors duration-300"></div>
                            <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-700 dark:group-hover:text-gray-200 font-light transition-colors duration-300">{recommendation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Indicator */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">Analysis Confidence:</span>
                      <div className={`px-3 py-1 rounded-2xl text-xs font-medium transition-colors duration-300 ${
                        result.aiAnalysis.confidence === 'high' 
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
                          : result.aiAnalysis.confidence === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                      }`}>
                        {result.aiAnalysis.confidence.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-light transition-colors duration-300">
                      Analyzed {result.commitPatterns.totalCommits} commits
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hackathon Compliance */}
            <div className="bg-gradient-to-r from-red-50 to-gray-50 dark:from-red-900/20 dark:to-gray-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl p-8 transition-colors duration-300">
              <h4 className="text-xl font-medium mb-4 text-red-700 dark:text-red-400 transition-colors duration-300">World's Largest Hackathon Compliance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl transition-colors duration-300 ${
                    result.isEligible && result.aiAnalysis && result.aiAnalysis.likelihood > 70 
                      ? 'bg-green-100 dark:bg-green-500/20' 
                      : 'bg-yellow-100 dark:bg-yellow-500/20'
                  }`}>
                    {result.isEligible && result.aiAnalysis && result.aiAnalysis.likelihood > 70 ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors duration-300" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 transition-colors duration-300" />
                    )}
                  </div>
                  <span className="text-sm font-light text-gray-700 dark:text-gray-300 transition-colors duration-300">Primary Bolt.new Development</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl transition-colors duration-300 ${
                    result.hasBoltNewBadge 
                      ? 'bg-green-100 dark:bg-green-500/20' 
                      : 'bg-red-100 dark:bg-red-500/20'
                  }`}>
                    {result.hasBoltNewBadge ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors duration-300" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 transition-colors duration-300" />
                    )}
                  </div>
                  <span className="text-sm font-light text-gray-700 dark:text-gray-300 transition-colors duration-300">Badge Requirement Check</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm font-light mt-4 transition-colors duration-300">
                {!result.isEligible
                  ? "This repository is not eligible for the hackathon due to its creation date."
                  : !result.hasBoltNewBadge
                    ? "This repository does not contain the required bolt.new badge in its source code."
                  : result.aiAnalysis && result.aiAnalysis.likelihood > 70 
                    ? "This project appears to meet the hackathon requirement of being primarily built with bolt.new."
                    : "This project may not fully meet the requirement of being primarily built with bolt.new. Manual review recommended."
                }
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!result && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <h3 className="text-2xl font-light mb-8 text-gray-900 dark:text-white transition-colors duration-300">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Github className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-white transition-colors duration-300">Repository Analysis</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">Real-time analysis of GitHub commits, verification status, and development patterns</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-white transition-colors duration-300">AI Detection</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">Powered by Gemini AI to detect AI-generated code patterns and development signatures</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-white transition-colors duration-300">Compliance Check</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">Validates hackathon eligibility and bolt.new development requirements</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm font-light transition-colors duration-300">
            <p>Built for World's Largest Hackathon • Powered by GitHub API & Gemini AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;