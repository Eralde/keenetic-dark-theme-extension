# Keenetic Dark Theme

Dark theme for the web UI of the Keenetic devices

## To build your copy of the extension:

- clone this repository
- install required dependencies (`npm install`)
- modify any extension files as you see fit
- run one of the `npm run build X` scripts (see below)

## Development build

Run on of the following commands:

    npm run dev chrome
    npm run dev firefox
    npm run dev opera
    npm run dev edge

Then load the extension from the `./dist/{browser}` folder.
It will reload itself automatically on
any change to the files in the `./app` folder.

## Production build

`npm` scripts:

Utility scripts:

- rebuild CSS files (execute manually after changes to the `./theme` files):<br/>
  `npm run build-css`

- rebuild the `app/scripts/lib/l10n.js` file:<br/>
  `npm run build-l10n`

Build an archive suitable for one of the browsers:

    npm run build chrome
    npm run build firefox
    npm run build opera
    npm run build edge

Archive for the Mozilla Firefox
can be signed as `.xpi` file
via the [`web-ext`](https://github.com/mozilla/web-ext) command line tool.

The `./packages` folder will contain an archive for the browser you've selected.
