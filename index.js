#!/usr/bin/env node
// TODO: clean up and abstract; better error handling
const inquirer = require("inquirer");
const execa = require("execa");
const fs = require("fs-extra");
const ejs = require("ejs");
const path = require("path");
const simpleGit = require("simple-git");
const { Octokit } = require("@octokit/rest");
const { exec } = require("child_process");

async function getGitHubToken() {
  try {
    console.log("🔐 Logging into GitHub via browser...");

    const { stderr: loginStderr } = await execa(
      "gh",
      ["auth", "login", "--web", "--scopes", "repo"],
      { stdio: "inherit" }
    );
    if (loginStderr) {
      console.error("Error during login:", loginStderr);
      process.exit(1);
    }

    const { stdout: token, stderr: tokenStderr } = await execa("gh", [
      "auth",
      "token",
    ]);
    if (tokenStderr) {
      console.error("Error getting token:", tokenStderr);
      process.exit(1);
    }

    console.log("GitHub authentication successful!");

    return token;
  } catch (err) {
    console.error("❌ GitHub CLI not found or login failed.");
    process.exit(1);
  }
}

// TODO: receieve style guide values from frontend request
async function getStyleGuide() {
  const styleGuide = {
    colors: {
      primary: "#ff00aa",
      secondary: "#00ffaa",
      background: "#ffffff",
      primaryText: "#000000",
      secondaryText: "#333333",
      accent: "#f0f0f0",
      white: "#ffffff",
      black: "#000000",
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      fontWeight: {
        regular: "400",
        bold: "700",
      },
      fontSize: {
        base: "16px",
        heading: "24px",
      },
    },
    spacing: {
      small: "8px",
      medium: "16px",
      large: "32px",
    },
    breakpoints: {
      mobile: "480px",
      tablet: "768px",
      desktop: "1024px",
    },
  };

  return styleGuide;
}

async function getPackageConfig() {
  const answers = await inquirer.prompt([
    { name: "repoName", message: "New GitHub Repo Name:" },
    { name: "npmToken", message: "NPM Token:" },
    { name: "packageName", message: "NPM Package Name:" },
  ]);

  return { ...answers };
}

async function getGitHubUsername(token) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.users.getAuthenticated();
  return data.login;
}

// TODO clean up this function
async function generateProject({ repoName, styleGuide }) {
  try {
    const templatePath = path.join(__dirname, "template");
    const destPath = path.join(process.cwd(), repoName);

    await fs.copy(templatePath, destPath);

    // TODO: update this to map through files in component folder
    const components = ["Button"];

    for (const component of components) {
      const componentJSXTemplate = path.join(
        destPath,
        `src/components/${component}/${component}.jsx.ejs`
      );
      const componentJSXOutput = path.join(
        destPath,
        `src/components/${component}/${component}.jsx`
      );

      const renderedComponent = await ejs.renderFile(componentJSXTemplate, {
        styleGuide,
        componentName: component,
      });
      await fs.outputFile(componentJSXOutput, renderedComponent);
      const cssTemplate = path.join(
        destPath,
        `src/components/${component}/${component}.css.ejs`
      );

      const componentCSSTemplate = path.join(
        destPath,
        `src/components/${component}/${component}.css.ejs`
      );
      const componentCSSOutput = path.join(
        destPath,
        `src/components/${component}/${component}.css`
      );

      const renderedCSS = await ejs.renderFile(componentCSSTemplate, {
        styleGuide,
        componentName: component,
      });
      await fs.outputFile(componentCSSOutput, renderedCSS);

      await fs.remove(componentJSXTemplate);
      await fs.remove(cssTemplate);
    }

    const themeTemplate = path.join(destPath, "src/theme.js.ejs");
    const themeOutput = path.join(destPath, "src/theme.js");
    const renderedTheme = await ejs.renderFile(themeTemplate, styleGuide);
    await fs.outputFile(themeOutput, renderedTheme);
    await fs.remove(themeTemplate);

    const indexTemplate = path.join(destPath, "src/index.js.ejs");
    const indexOutput = path.join(destPath, "src/index.js");
    const renderedIndex = await ejs.renderFile(indexTemplate, { components });
    await fs.outputFile(indexOutput, renderedIndex);
    await fs.remove(indexTemplate);

    const packageJsonOutput = path.join(destPath, "package.json");
    const renderPackageJson = await ejs.renderFile(
      "template/package.json.ejs",
      {
        packageName: repoName,
      }
    );
    await fs.outputFile(packageJsonOutput, renderPackageJson);
    await fs.remove(`${repoName}/package.json.ejs`);

    const readMeOutput = path.join(destPath, "README.md");
    const renderReadMe = await ejs.renderFile("template/README.md.ejs", {
      packageName: repoName,
    });
    await fs.outputFile(readMeOutput, renderReadMe);
    await fs.remove(`${repoName}/README.md.ejs`);

    await fs.copyFile("template/.gitignore", `${repoName}/.gitignore`);
  } catch (error) {
    console.log("error", error);
  }
}

async function setupGitHubRepo(githubToken, githubUsername, repoName) {
  const octokit = new Octokit({ auth: githubToken });

  await octokit.repos.createForAuthenticatedUser({ name: repoName });

  const repoPath = path.join(process.cwd(), repoName);
  const git = simpleGit(repoPath);

  await git.init();
  await git.add(".");
  await git.commit("Initial commit");
  await git.addRemote(
    "origin",
    `https://github.com/${githubUsername}/${repoName}.git`
  );
  await git.push("origin", "main");
}

function runNpmInstall({ repoName }) {
  const folderPath = path.join(__dirname, repoName);

  exec("npm install", { cwd: folderPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error in ${repoName}: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ stderr in ${repoName}: ${stderr}`);
    }
    console.log(`✅ npm install in ${repoName} completed:\n${stdout}`);
  });
}

(async () => {
  const githubToken = await getGitHubToken();
  const githubUsername = await getGitHubUsername(githubToken);

  const packageConfig = await getPackageConfig();
  const styleGuide = await getStyleGuide();
  const projectConfig = { ...packageConfig, styleGuide };
  await generateProject(projectConfig);
  runNpmInstall({ repoName: packageConfig.repoName });
  await setupGitHubRepo(githubToken, githubUsername, packageConfig.repoName);
  // TODO
  // await publishToNPM(answers);

  //   console.log(`✅ Project ${answers.repoName} is live on GitHub an  d NPM!`);
})();
