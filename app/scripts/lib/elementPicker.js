export const elementPicker = (function() {
    const defaultBackgroundColor = `
repeating-linear-gradient(
  -45deg,
  #222,
  #222 10px,
  #666 10px,
  #666 20px
)`;

    let targetBackgroundColor;
    let oldTarget;
    let oldBackgroundColor;
    let onClick;

    function onMouseMove(event) {
        const target = event.target;

        if (oldTarget) {
            resetOldTargetColor();
        } else {
            document.body.style.cursor = 'pointer';
        }

        oldTarget = target;
        oldBackgroundColor = target.style.backgroundColor;
        target.style.backgroundColor = defaultBackgroundColor;
    }

    function onMouseClick(event) {
        const target = event.target;

        event.preventDefault();
        event.stopPropagation();
        onClick(target);

        reset();

        return false;
    }

    function reset() {
        document.removeEventListener('click', onMouseClick, false);
        document.removeEventListener('mousemove', onMouseMove, false);

        document.body.style.cursor = 'auto';

        if (oldTarget) {
            resetOldTargetColor();
        }

        oldTarget = null;
        oldBackgroundColor = null;
    }

    function resetOldTargetColor() {
        oldTarget.style.backgroundColor = oldBackgroundColor
    }

    function init(options) {
        if (!options || !options.onClick) {
            console.error('onClick option needs to be specified.');
            return;
        }

        targetBackgroundColor = options.backgroundColor || defaultBackgroundColor
        onClick = options.onClick;

        document.addEventListener('click', onMouseClick, false);
        document.addEventListener('mousemove', onMouseMove, false);

        return {
            reset,
        };
    }


    return init;
})();
