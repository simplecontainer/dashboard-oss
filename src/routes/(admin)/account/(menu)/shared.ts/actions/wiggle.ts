export function wiggle(node: HTMLElement) {
    const wiggle = () => {
        node.classList.add('wiggle');
        setTimeout(() => node.classList.remove('wiggle'), 500);
    };

    node.addEventListener('click', wiggle);

    return {
        destroy() {
            node.removeEventListener('click', wiggle);
        }
    };
}
