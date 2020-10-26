import '../common/tweaks';

process.on('unhandledRejection', r => {
    console.error("Unhandled promise rejection!");
    console.error(r);
});
