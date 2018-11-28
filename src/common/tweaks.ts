// tslint:disable:no-console

try {
    require('babel-polyfill');
} catch (e) {
    console.log("Polyfills not found; probably not needed");
}


process.on('unhandledRejection', r => {
    console.error("Unhandled promise rejection!");
    console.error(r);
});



console.log("Tweaks loaded");
