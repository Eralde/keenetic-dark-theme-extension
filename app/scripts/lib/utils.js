export const startsWith = (haystack, needle) => {
    return haystack.substr(0, needle.length) === needle;
};

export const partition = (array, predicate) => {
    return array.reduce(
        ([pass, fail], elem) => {
            return predicate(elem)
                ? [[...pass, elem], fail]
                : [pass, [...fail, elem]];
        },
        [[], []],
    );
};
