/**
 * Test Case Generator UI
 * Frontend integration for Gemini-powered test case generation
 * Handles UI interactions and API communication
 */

class TestCaseGeneratorUI {
  constructor(config = {}) {
    this.apiBaseUrl = config.apiBaseUrl || "http://localhost:3000";
    this.isGenerating = false;
    this.generatedTestCases = [];
    this.selectedStory = null;

    this.initializeEventListeners();
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners() {
    // Generate Test Cases button
    const generateBtn = document.getElementById("generateTestCasesBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => this.handleGenerateClick());
    }

    // Listen for story selection changes
    document.addEventListener("storySelected", (e) => {
      this.selectedStory = e.detail;
      this.updateGenerateButtonState();
    });

    // Listen for Jira card clicks (story selection)
    document.addEventListener("jiraCardClicked", (e) => {
      this.selectedStory = e.detail;
      this.updateGenerateButtonState();
    });
  }

  /**
   * Handle Generate Test Cases button click
   */
  async handleGenerateClick() {
    if (!this.selectedStory) {
      this.showError("Please select a user story first");
      return;
    }

    if (this.isGenerating) {
      this.showError("Test case generation is already in progress");
      return;
    }

    const storyData = this.extractStoryData(this.selectedStory);
    if (!storyData.acceptanceCriteria) {
      this.showError(
        "Selected story does not have acceptance criteria. Please add acceptance criteria to the story."
      );
      return;
    }

    await this.generateTestCases(storyData);
  }

  /**
   * Extract relevant story data from selected story
   */
  extractStoryData(story) {
    let storyId, storyTitle, acceptanceCriteria, description;

    // If story is a Jira card object
    if (story.key) {
      storyId = story.key;
      storyTitle = story.fields?.summary || story.title || "";
      acceptanceCriteria =
        story.fields?.customfield_acceptance_criteria ||
        story.acceptanceCriteria ||
        story.fields?.description ||
        "";
      description = story.fields?.description || story.description || "";
    } else if (typeof story === "string") {
      // If story is just an ID or title
      storyId = story;
      storyTitle = story;
    } else {
      // Fallback to story properties
      storyId = story.storyId || story.id || "unknown";
      storyTitle = story.title || story.storyTitle || "";
      acceptanceCriteria = story.acceptanceCriteria || story.criteria || "";
      description = story.description || "";
    }

    return {
      storyId,
      storyTitle,
      acceptanceCriteria,
      description,
    };
  }

  /**
   * Generate test cases via Gemini API
   */
  async generateTestCases(storyData) {
    this.isGenerating = true;
    this.updateGenerateButtonState();

    try {
      // Show loading state
      this.showLoading("Generating test cases with Gemini LLM...");

      // Call backend API
      const response = await fetch(
        `${this.apiBaseUrl}/api/test-cases/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storyId: storyData.storyId,
            storyTitle: storyData.storyTitle,
            acceptanceCriteria: storyData.acceptanceCriteria,
            description: storyData.description,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `API Error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate test cases");
      }

      this.generatedTestCases = result.data.testCases;

      // Display generated test cases
      this.displayGeneratedTestCases(result.data);

      // Show success message
      this.showSuccess(
        `Successfully generated ${result.data.testCases.length} test cases!`
      );
    } catch (error) {
      console.error("Error generating test cases:", error);
      this.showError(`Failed to generate test cases: ${error.message}`);
    } finally {
      this.isGenerating = false;
      this.updateGenerateButtonState();
    }
  }

  /**
   * Display generated test cases in the UI
   */
  displayGeneratedTestCases(testCaseData) {
    const testCasesContainer =
      document.getElementById("testCasesContainer") ||
      document.querySelector(".test-cases-section") ||
      document.querySelector(".testdesign-result");

    if (!testCasesContainer) {
      console.warn("Test cases container not found. Creating one.");
      this.createTestCasesContainer();
      return;
    }

    // Clear existing content
    testCasesContainer.innerHTML = "";

    // Create header with summary
    const header = this.createSummaryHeader(testCaseData.summary);
    testCasesContainer.appendChild(header);

    // Group test cases by scenario type
    const groupedCases = this.groupTestCasesByScenario(
      testCaseData.testCases
    );

    // Render test cases grouped by scenario type
    Object.entries(groupedCases).forEach(([scenarioType, cases]) => {
      const section = this.createScenarioSection(scenarioType, cases);
      testCasesContainer.appendChild(section);
    });

    // Add export options
    const exportButtons = this.createExportButtons();
    testCasesContainer.appendChild(exportButtons);
  }

  /**
   * Create summary header
   */
  createSummaryHeader(summary) {
    const header = document.createElement("div");
    header.className = "test-case-generation-header";
    header.style.cssText = `
      background: linear-gradient(135deg, #0f1f35, #1a2f4a);
      border: 1px solid #2a3f5a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    `;

    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #e0e0e0; font-size: 16px;">Generated Test Cases</h3>
        <span style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 4px 12px; border-radius: 10px; font-size: 12px; font-weight: 600;">
          Generated by Gemini LLM
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
        <div style="background: #0a1628; border: 1px solid #1a2f4a; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: white;">${summary.totalTestCases}</div>
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Total</div>
        </div>
        <div style="background: #0a1628; border: 1px solid #1a2f4a; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #10b981;">${summary.positiveCount}</div>
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Positive</div>
        </div>
        <div style="background: #0a1628; border: 1px solid #1a2f4a; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #f87171;">${summary.negativeCount}</div>
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Negative</div>
        </div>
        <div style="background: #0a1628; border: 1px solid #1a2f4a; border-radius: 6px; padding: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #a78bfa;">${summary.boundaryCount}</div>
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Boundary</div>
        </div>
      </div>
    `;

    return header;
  }

  /**
   * Group test cases by scenario type
   */
  groupTestCasesByScenario(testCases) {
    const grouped = {};

    testCases.forEach((tc) => {
      const scenario = tc.scenario || "Other";
      if (!grouped[scenario]) {
        grouped[scenario] = [];
      }
      grouped[scenario].push(tc);
    });

    return grouped;
  }

  /**
   * Create scenario section
   */
  createScenarioSection(scenarioType, cases) {
    const section = document.createElement("div");
    section.className = "test-case-scenario-section";
    section.style.cssText = `
      background: #0f1f35;
      border: 1px solid #1a2f4a;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    `;

    // Section header
    const header = document.createElement("div");
    header.style.cssText = `
      padding: 12px 16px;
      background: #0a1628;
      border-bottom: 1px solid #1a2f4a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    `;

    const scenarioColor =
      scenarioType === "Positive"
        ? "#10b981"
        : scenarioType === "Negative"
          ? "#f87171"
          : "#a78bfa";

    header.innerHTML = `
      <h4 style="margin: 0; color: ${scenarioColor}; font-size: 13px; font-weight: 600;">
        ${scenarioType} Scenarios (${cases.length})
      </h4>
      <span style="color: #64748b; font-size: 12px;">▼</span>
    `;

    // Cases container
    const casesContainer = document.createElement("div");
    casesContainer.className = "test-case-items";
    casesContainer.style.cssText = `
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    cases.forEach((tc) => {
      const caseCard = this.createTestCaseCard(tc);
      casesContainer.appendChild(caseCard);
    });

    // Toggle functionality
    header.addEventListener("click", () => {
      casesContainer.style.display =
        casesContainer.style.display === "none" ? "flex" : "none";
    });

    section.appendChild(header);
    section.appendChild(casesContainer);

    return section;
  }

  /**
   * Create individual test case card
   */
  createTestCaseCard(tc) {
    const card = document.createElement("div");
    card.className = "test-case-card";
    card.style.cssText = `
      background: #0a1628;
      border: 1px solid #1a2f4a;
      border-radius: 6px;
      padding: 12px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    `;

    card.onmouseover = () => {
      card.style.borderColor = "#2a3f5a";
      card.style.background = "#0f1f35";
    };
    card.onmouseout = () => {
      card.style.borderColor = "#1a2f4a";
      card.style.background = "#0a1628";
    };

    const priorityColor =
      tc.priority === "High"
        ? "#f87171"
        : tc.priority === "Medium"
          ? "#f59e0b"
          : "#10b981";

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          <div style="font-size: 11px; color: #3b82f6; font-weight: 700; margin-bottom: 2px;">${tc.id}</div>
          <div style="font-size: 13px; color: #e0e0e0; font-weight: 600;">${tc.title}</div>
        </div>
        <span style="background: ${priorityColor}20; color: ${priorityColor}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; white-space: nowrap;">
          ${tc.priority}
        </span>
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">${tc.description}</div>
      <div style="background: #050e1a; border: 1px solid #1a2f4a; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Steps:</div>
        ${tc.steps
          .map((s) => `<div style="font-size: 11px; color: #cbd5e1; margin-bottom: 2px;">• ${s.action}</div>`)
          .join("")}
      </div>
      <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); border-radius: 4px; padding: 8px;">
        <div style="font-size: 10px; color: #6ee7b7; font-weight: 600; margin-bottom: 4px;">Expected Result:</div>
        <div style="font-size: 11px; color: #6ee7b7;">${tc.expectedResult}</div>
      </div>
      ${
        tc.testData
          ? `<div style="background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.2); border-radius: 4px; padding: 8px; margin-top: 8px;">
        <div style="font-size: 10px; color: #a5b4fc; font-weight: 600; margin-bottom: 4px;">Test Data:</div>
        <div style="font-size: 11px; color: #a5b4fc;">${tc.testData}</div>
      </div>`
          : ""
      }
    `;

    return card;
  }

  /**
   * Create export buttons
   */
  createExportButtons() {
    const container = document.createElement("div");
    container.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #1a2f4a;
    `;

    const exportJSON = this.createButton("Export as JSON", () => {
      this.exportTestCases("json");
    });

    const exportMarkdown = this.createButton("Export as Markdown", () => {
      this.exportTestCases("markdown");
    });

    const exportCSV = this.createButton("Export as CSV", () => {
      this.exportTestCases("csv");
    });

    const saveToJira = this.createButton("Save to Jira", () => {
      this.saveTestCasesToJira();
    });

    container.appendChild(exportJSON);
    container.appendChild(exportMarkdown);
    container.appendChild(exportCSV);
    container.appendChild(saveToJira);

    return container;
  }

  /**
   * Create styled button
   */
  createButton(text, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    `;

    button.onmouseover = () => {
      button.style.opacity = "0.9";
    };
    button.onmouseout = () => {
      button.style.opacity = "1";
    };

    button.addEventListener("click", onClick);

    return button;
  }

  /**
   * Export test cases
   */
  async exportTestCases(format) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/test-cases/format`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testCases: this.generatedTestCases,
          format,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      const result = await response.json();
      this.downloadFile(result.data, `test-cases.${format}`);
      this.showSuccess(`Test cases exported as ${format.toUpperCase()}`);
    } catch (error) {
      this.showError(`Failed to export test cases: ${error.message}`);
    }
  }

  /**
   * Save test cases to Jira (implementation depends on Jira integration)
   */
  async saveTestCasesToJira() {
    try {
      if (!this.selectedStory || !this.selectedStory.key) {
        this.showError("No story selected");
        return;
      }

      // Create a test case tracking issue in Jira
      const response = await fetch(
        `${this.apiBaseUrl}/api/jira/create-test-cases`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storyKey: this.selectedStory.key,
            testCases: this.generatedTestCases,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save to Jira");

      this.showSuccess("Test cases saved to Jira");
    } catch (error) {
      this.showError(`Failed to save to Jira: ${error.message}`);
    }
  }

  /**
   * Download file helper
   */
  downloadFile(content, filename) {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * Create test cases container if it doesn't exist
   */
  createTestCasesContainer() {
    const container = document.createElement("div");
    container.id = "testCasesContainer";
    container.style.cssText = `
      padding: 24px;
      background: #0a1628;
      border-radius: 8px;
      margin-top: 20px;
    `;

    const mainPanel =
      document.querySelector(".testdesign-panel") ||
      document.querySelector(".main-panel");

    if (mainPanel) {
      mainPanel.appendChild(container);
    }
  }

  /**
   * Update generate button state
   */
  updateGenerateButtonState() {
    const generateBtn = document.getElementById("generateTestCasesBtn");
    if (generateBtn) {
      generateBtn.disabled = !this.selectedStory || this.isGenerating;
      generateBtn.textContent = this.isGenerating
        ? "Generating..."
        : "Generate Test Cases";
    }
  }

  /**
   * Show loading notification
   */
  showLoading(message) {
    this.showNotification(message, "info", 0);
  }

  /**
   * Show success notification
   */
  showSuccess(message) {
    this.showNotification(message, "success", 3000);
  }

  /**
   * Show error notification
   */
  showError(message) {
    this.showNotification(message, "error", 4000);
  }

  /**
   * Show notification
   */
  showNotification(message, type, duration) {
    const notification = document.createElement("div");
    notification.className = `test-case-notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 28px;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      z-index: 10000;
      animation: notificationSlideIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      max-width: 340px;
    `;

    if (type === "success") {
      notification.style.background = "#059669";
      notification.style.color = "white";
      notification.style.border = "1px solid rgba(16,185,129,0.5)";
    } else if (type === "error") {
      notification.style.background = "#b91c1c";
      notification.style.color = "white";
      notification.style.border = "1px solid rgba(248,113,113,0.5)";
    } else {
      notification.style.background = "#3b82f6";
      notification.style.color = "white";
      notification.style.border = "1px solid rgba(59,130,246,0.5)";
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    if (duration > 0) {
      setTimeout(() => {
        notification.remove();
      }, duration);
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.testCaseGenerator = new TestCaseGeneratorUI();
  });
} else {
  window.testCaseGenerator = new TestCaseGeneratorUI();
}
