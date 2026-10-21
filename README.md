# Artemis site (static)

Static build of the Artemis website for GitHub Pages, served at
https://artemisai-bycutlineindustries.studio once DNS points here.

Source of truth: the `site/` directory of the main Cutline Industries repo.
The chat workspace, sign-in/sign-up and account features need the Artemis
gateway's same-origin `/api/*` routes and do not work from static hosting alone.
