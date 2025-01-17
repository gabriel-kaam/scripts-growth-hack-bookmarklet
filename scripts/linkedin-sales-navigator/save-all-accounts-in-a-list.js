var $ = jQuery;

var working = false;
var list_name;
var limit;

const TIME_FOR_PAGE_TO_LOAD = 2000;
const TIME_AFTER_CLICK = 500;
const TIMEOUT_LIMIT = 10000;
const LIMIT_MAX = 1000;

var selectors = {
    select_all: '[data-sn-view-name="module-account-search-results"] > .p0 input[type="checkbox"], [data-sn-view-name="module-lead-search-results"] > .p0 input[type="checkbox"]',
    list_of_list__opener: '.p4 > div > button[data-x--save-menu-trigger]',
    list_of_list__item: '#hue-web-menu-outlet [data-popper-placement="bottom"] button',
    pagination: '[data-sn-view-name="search-pagination"]',
    pagination_next: '[data-sn-view-name="search-pagination"] .artdeco-pagination__button--next',
    pagination_page_1: '[data-test-pagination-page-btn="1"] button',
};

function get_list_name_from_node(node) {
    return node.querySelector('._list-name_aii1oi').ariaLabel;
}
function get_count_from_node(node) {
    return parseInt(
        node.querySelector('._list-entity-count_aii1oi').innerText.replace(' ', '').match(/[0-9]+/)[0]
        );
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = TIMEOUT_LIMIT) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            if ($(selector).length > 0) {
                clearInterval(interval);
                resolve($(selector));
            } else if (elapsedTime >= timeout) {
                clearInterval(interval);
                reject(`Element ${selector} not found within ${timeout}ms`);
            }
        }, 100);
    });
}

async function open_list_of_list() {
    console.debug('Opening list of lists');

    try {
        const opener = await waitForElement(selectors.list_of_list__opener);
        if (opener[0].ariaExpanded !== 'true') {
            opener.click();
        } else {
            console.debug("\t -> already open");
        }
        await sleep(TIME_AFTER_CLICK);
    } catch (error) {
        working = false;
        console.error(error);
    }
}

async function close_list_of_list() {
    console.debug('Closing list of lists');

    try {
        const opener = await waitForElement(selectors.list_of_list__opener);
        if (opener[0].ariaExpanded !== 'false') {
            opener.click();
        } else {
            console.debug("\t -> already closed");
        }
        await sleep(TIME_AFTER_CLICK);
    } catch (error) {
        working = false;
        console.error(error);
    }
}

async function it_was_last_page() {
    console.debug('Checking if it was the last page...');

    try {
        const nextButton = await waitForElement(selectors.pagination_next);
        if (nextButton.is(':disabled')) {
            console.debug('It was the last page!');

            working = false;
            alert("Process completed!");
            return true;
        }
        return false;
    } catch (error) {
        working = false;
        console.error(error);
        return false;
    }
}

async function do_magic_2() {
    console.debug('Checking ALL items on page...');

    try {
        const selectAllCheckbox = await waitForElement(selectors.select_all);
        if (!selectAllCheckbox.is(':checked')) {
            console.debug('Selecting all items...');
            selectAllCheckbox.click();
        } else {
            console.debug("\t -> already selected");
        }

        await sleep(TIME_AFTER_CLICK);
        await open_list_of_list();

        const listItems = await waitForElement(selectors.list_of_list__item);
        let listSelected = false;

        listItems.each((idx, button) => {
            const button_name = get_list_name_from_node(button);

            if (list_name === button_name) {
                const count = get_count_from_node(button);

                console.debug(`Found our LIST! "[${idx}] ${button_name}" - Count: ${count} | Limit: ${limit}`);

                if(count >= limit) {
                    alert(`List ${button_name} is already full. Need to select another one.`);
                    listSelected = false;
                    return false;
                } else {
                    button.click();
                    listSelected = true;
                    return false;

                }
            }
        });

        if (!listSelected) {
            console.debug("Could not find the list on this page.");
            return false;
        }

        await sleep(TIME_AFTER_CLICK);
        await close_list_of_list();

        if (await it_was_last_page()) return;

        console.debug('Going to next page...');
        const nextButton = await waitForElement(selectors.pagination_next);
        nextButton.click();

        await sleep(TIME_FOR_PAGE_TO_LOAD);
        await do_magic_2();

        return false;
    } catch (error) {
        working = false;
        console.error(error);
    }
}

$(document).on('click', selectors.list_of_list__item, async (event) => {
    if (working) return;

    list_name = get_list_name_from_node(event.currentTarget);
    console.debug(`A list was selected: "${list_name}"`);

    limit = prompt(`How many leads should we save from this list ? (ESC to cancel) "${list_name}"`, LIMIT_MAX);

    if (limit != null) {
        limit = Math.min(limit, LIMIT_MAX);

        working = true;
        console.debug('+ Setting working to TRUE');

        await close_list_of_list();

        try {
            const pageOneButton = await waitForElement(selectors.pagination_page_1);
            if (pageOneButton[0].ariaCurrent !== 'true') {
                console.debug('Navigating to page 1...');
                pageOneButton.click();
            }

            await sleep(TIME_FOR_PAGE_TO_LOAD);
            await do_magic_2();
        } catch (error) {
            console.error(error);
        } finally {
            working = false;
        }
    }

    return true;
});

alert("Rock N Roll Baby ! I'm ready");
