/* helper class for parsing regex from formatted date string */

class EnhancedDatePickerPart {
    constructor(initial) {
        this.initial = initial;
        this.index = 0;
        this.value = 0;
    }

    static compare(part1, part2) {
        if (part1.index < part2.index) {
            return -1;
        }
        if (part1.index > part2.index) {
            return 1;
        }
        return 0;
    }
}
window.Vaadin.Flow.enhancedDatepickerConnector = {
    initLazy: function (datepicker) {
        // Check whether the connector was already initialized for the datepicker
        if (datepicker.$connector) {
            return;
        }

        datepicker.$connector = {};

        /* init helper parts for reverse-engineering date-regex */
        datepicker.$connector.dayPart = new EnhancedDatePickerPart("22");
        datepicker.$connector.monthPart = new EnhancedDatePickerPart("11");
        datepicker.$connector.yearPart = new EnhancedDatePickerPart("1987");
        datepicker.$connector.parts = [datepicker.$connector.dayPart, datepicker.$connector.monthPart, datepicker.$connector.yearPart];

        datepicker.$connector.pattern = 'dd/MM/yyyy';
        datepicker.$connector.defaultPattern = 'dd/MM/yyyy';
        datepicker.$connector.parsers = [];
        datepicker.$connector.defaultLocale = 'en-US';
        //dd/MM/yyyy
        // Old locale should always be the default vaadin-date-picker component
        // locale {English/US} as we init lazily and the date-picker formats
        // the date using the default i18n settings and we need to use the input
        // value as we may need to parse user input so we can't use the _selectedDate value.
        let oldLocale = "en-us";

        datepicker.addEventListener('blur', e => {
            if (!e.target.value && e.target.invalid) {
                console.warn("Invalid value in the DatePicker.");
            }
        });

        const cleanString = function (string) {
            // Clear any non ascii characters from the date string,
            // mainly the LEFT-TO-RIGHT MARK.
            // This is a problem for many Microsoft browsers where `toLocaleDateString`
            // adds the LEFT-TO-RIGHT MARK see https://en.wikipedia.org/wiki/Left-to-right_mark
            return string.replace(/[^\x00-\x7F]/g, "");
        };

        const getInputValue = function () {
            let inputValue = '';
            try {
                inputValue = datepicker._inputValue;
            } catch(err) {
                /* component not ready: falling back to stored value */
                inputValue = datepicker.value || '';
            }
            return inputValue;
        }

        datepicker.$connector.setLocaleAndPattern = function (locale, pattern) {
            this.setLocalePatternAndParsers(locale, pattern, this.parsers);
        }

        datepicker.$connector.setLocalePatternAndParsers = function (locale, pattern, parsers) {
            let language = locale ? locale.split("-")[0] : "enUS";
            let currentDate = false;
            let inputValue = getInputValue();
            if (datepicker.i18n.parseDate !== 'undefined' && inputValue) {
                /* get current date with old parsing */
                currentDate = datepicker.i18n.parseDate(inputValue);
            }

            /* create test-string where to extract parsing regex */
            let testDate = new Date(datepicker.$connector.yearPart.initial, datepicker.$connector.monthPart.initial - 1, datepicker.$connector.dayPart.initial);
            let testString = cleanString(testDate.toLocaleDateString(locale));
            datepicker.$connector.parts.forEach(function (part) {
                part.index = testString.indexOf(part.initial);
            });
            /* sort items to match correct places in regex groups */
            datepicker.$connector.parts.sort(EnhancedDatePickerPart.compare);
            /* create regex
             * regex will be the date, so that:
             * - day-part is '(\d{1,2})' (1 or 2 digits),
             * - month-part is '(\d{1,2})' (1 or 2 digits),
             * - year-part is '(\d{4})' (4 digits)
             *
             * and everything else is left as is.
             * For example, us date "10/20/2010" => "(\d{1,2})/(\d{1,2})/(\d{4})".
             *
             * The sorting part solves that which part is which (for example,
             * here the first part is month, second day and third year)
             *  */
            datepicker.$connector.regex = testString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(datepicker.$connector.dayPart.initial, "(\\d{1,2})").replace(datepicker.$connector.monthPart.initial, "(\\d{1,2})").replace(datepicker.$connector.yearPart.initial, "(\\d{4})");

            datepicker.i18n.formatDate = function (date) {
                let rawDate = new Date(date.year, date.month, date.day);
                return DateFns.format(rawDate, pattern, {locale: DateFns.locales[language]});
            };

            datepicker.i18n.parseDate = function (dateString) {
                if (dateString.length == 0) {
                    return;
                }

                var parsersCopy = JSON.parse(JSON.stringify(parsers));
                parsersCopy.push(pattern);

                var date;
                var i;
                for (i in parsersCopy) {
                    try {
                        date = DateFns.parse(dateString,
                            parsersCopy[i],
                            new Date(), {locale: DateFns.locales[language]});
                        if (date != 'Invalid Date') {
                            break;
                        }
                    }
                      catch(err) {
                        
                    }
                }

                return {
                    day: date.getDate(),
                    month: date.getMonth(),
                    year: date.getFullYear()
                };
            };

            if (inputValue === "") {
                oldLocale = locale;
            } else if (currentDate) {
                /* set current date to invoke use of new locale */
                datepicker._selectedDate = new Date(currentDate.year, currentDate.month, currentDate.day);
            }
        }

        datepicker.$connector.setLocale = function (locale) {
            try {
                // Check whether the locale is supported or not
                new Date().toLocaleDateString(locale);
            } catch (e) {
                locale = "en-US";
                console.warn("The locale is not supported, using default locale setting(en-US).");
            }

            this.locale = locale;
            this.setLocalePatternAndParsers(this.locale, this.pattern, this.parsers);
        }


        datepicker.$connector.setPattern = function(pattern) {
            this.pattern = pattern ? pattern : this.defaultPattern;
            this.setLocalePatternAndParsers(this.locale, this.pattern, this.parsers);
        }

        datepicker.$connector.setParsers = function(...parsers) {
            this.parsers = parsers;
            this.setLocalePatternAndParsers(this.locale, this.pattern, this.parsers);
        }
    }
}
