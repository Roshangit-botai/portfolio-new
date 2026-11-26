# Mr Roshan Singha - Portfolio

A responsive personal portfolio website for **Mr Roshan Singha**, a senior software developer focused on scalable web applications, microservices, databases, machine learning, and cloud infrastructure.

The portfolio uses plain HTML, CSS, and JavaScript, with a small Node.js server for Gemini chat. No third-party Node packages are required.

## Portfolio Preview

### Home

![Portfolio homepage preview](assets/portfolio-home.png)

## Features

- Responsive, dark-themed portfolio interface
- Animated network, rocket, original armored flyer, shooting-star, and scroll effects
- About, skills, education, projects, experience, certifications, and achievements sections
- Gemini-powered portfolio assistant with conversation context
- Voice questions, voice navigation, and optional spoken answers
- Server-side Gemini API key handling and request limits
- Interactive 3D-style background powered by Three.js
- Reduced-motion support for accessible animation preferences
- Direct links for email, LinkedIn, GitHub, social profiles, and mentoring

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js built-in HTTP server
- Google Gemini API
- Three.js
- Google Fonts
- Simple Icons and Devicon

## Project Structure

```text
.
|-- index.html                  # Main website markup
|-- server.js                   # Static hosting and secure Gemini API proxy
|-- server.test.js              # Built-in Node.js API and static-serving tests
|-- package.json
|-- .env.example                # Gemini configuration template
|-- assets/
|   |-- styles.css              # Portfolio styles and responsive layouts
|   |-- script.js               # Portfolio interactions and animations
|   |-- profile.webp            # Profile portrait
|   |-- tapestry-of-resilience.png
|   `-- portfolio-home.png      # README homepage preview
|-- projects portfolio new.code-workspace
`-- README.md
```

## Run Locally

Requires Node.js 20.6 or newer. No package installation is needed.

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy the example environment file and add your key:

   ```powershell
   Copy-Item .env.example .env
   ```

   Open `.env` and replace the `GEMINI_API_KEY` placeholder. Keep this key private; `.env` is ignored by Git.

3. Start the server from the project directory:

   ```powershell
   npm start
   ```

4. Open <http://localhost:3000>.

Run the server tests with:

```powershell
npm test
```

The model defaults to `gemini-3.5-flash-lite`; set `GEMINI_MODEL` in `.env` to choose another supported model. The API key remains on the server and is never sent to the browser. Gemini API quota or billing may apply.

## Browser Support

The portfolio uses modern browser features, including CSS `color-mix()`, WebGL through Three.js, and speech recognition through the Web Speech API.

Voice questions and navigation require a supported browser, microphone permission, and a secure context (localhost or HTTPS). Spoken answers use the browser's built-in speech synthesis. Text chat remains available if speech features are unsupported.

## Deployment

Deploy this project to a Node.js host such as Render, Railway, Fly.io, or Azure App Service. Configure `GEMINI_API_KEY` as a private environment secret and set `PORT` if required by the host. The server serves the portfolio files and provides the Gemini endpoint.

Because Gemini requests require the server-side API key, static-only hosting such as GitHub Pages cannot run the assistant by itself.

## Contact

- LinkedIn: <https://www.linkedin.com/in/roshansingha3>
- GitHub: <https://github.com/roshan-gitbot-ai>
- Email: <mailto:lroshansingha@protonmail.com>
- Mentoring: <https://topmate.io/roshan_singha>
