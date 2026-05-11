///=========================================
///SPINNER FOR BUTTONS THAT AWAITS PROMISES
///=========================================

export function setButtonLoading(button: HTMLButtonElement | null) {
    if (button) {
        button.disabled = true;
        button.querySelector(".spinner")?.classList.remove('display-none');
        button.querySelector(".btn-content")?.classList.add('display-none')
    }
}

export function restoreButtonLoading(button: HTMLButtonElement | null) {
    if (button) {
        button.querySelector(".btn-content")?.classList.remove('display-none')
        button.querySelector(".spinner")?.classList.add('display-none');
        button.disabled = false;
    }
}

/**
 * Applies load state to a button while a primse is executed
 */
export async function withButtonLoading<T>(
    button: HTMLButtonElement,
    promise: Promise<T>,
): Promise<T> {
    setButtonLoading(button);
    try {
        return await promise;
    } finally {
        restoreButtonLoading(button)
    }
}

