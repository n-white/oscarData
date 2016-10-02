#Instructions to run script
In the terminal from the root folder please run `npm install` to install node_module dependencies

`npm start` to run the oscarData.js script

Note: each year's winning title and budget will be logged to your terminal

#Estimated average budget of all winners (1927 - 2014)
$17,260,453

#Brief summary of my approach

My approach follows three steps:

1. Gather the list of winners for every year (Title, Year and Detail URL) with a GET request to 'http://oscars.yipitdata.com/'
2. Iterate through the list of winners and make a GET request to the winner's "Detail URL" to obtain the budget
3. Scrub various edge cases of the budget (brackets, foreign currency conversions, etc.)

Steps 1 and 2 above are straightforward, but assumptions were required for scrubbing the budget data and making it consistent.
Below is a general outline of my approach to cleaning up edge cases in the budget data:
- Remove extraneous notations that come after the budget number (e.g., bracket notations, "est." flags, etc.)
- If two budget numbers are given (e.g., one USD and one GBP), use the USD number
- If a number is written in english (e.g., "$2 million"), convert it to a real number (e.g., "$2,000,000")
- If no budget is defined, mark as "N/A" and don't include in the average budget calculation
- If a budget lower and upper bound range is given, take the average of the range
- If a budget is given in British Pounds, I used a 1.7 currency conversion. This could be later improved with taking the exchange rate for that year.

