module.exports = `
<script>
(() => {
    const eventSource = new EventSource('/__live_reload');

    eventSource.addEventListener('message', (event) => {
        if (event.data === 'reload') {
            location.reload();
        }
    });

    eventSource.addEventListener('error', () => {
        eventSource.close();
    });
})();
</script>
`;