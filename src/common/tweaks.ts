try {
    require('babel-polyfill');
} catch (e) {
    console.log("Polyfills not found; probably not needed");
}
