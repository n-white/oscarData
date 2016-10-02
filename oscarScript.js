// Request module is used to make the multiple GET requests
const request = require('request');
// Bluebird is used to create promises for an asynchronous process
const bluebird = require('bluebird');

// Function which requests initial raw data dump
// Returns the title, budget and year data for each winner
const getWinnerList = () => (
	new Promise((resolve, reject) => {
		request.get({
			method: 'GET',
			url: 'http://oscars.yipitdata.com'
		}, (err, results) => {
			if (err) {
				reject(err);
			} else {
				// winnerList array initialized
				let winnerList = [];
				// Grab raw data from the body of the JSON object
				const rawData = JSON.parse(results.body).results;
				// Iterate through every grouped list of films by year
				rawData.forEach((nominatedFilms, index) => {
					// Iterate through each film in that year's group
					nominatedFilms.films.forEach((film) => {
						// If the film was a winner
						if (film['Winner'] == true) {
							// Grab the title (and remove unnecessary brackets)
							const title = film['Film'].replace(/ *\[[^)]*\] */g, "");
							// Grab the year data (and remove unnecessary info)
							const year = nominatedFilms['year'].slice(0, 4);
							// Grab the detail Url which we'll later use to get the budget
							const detailUrl = film['Detail URL'];
							// Add the film details to the winnerList
							winnerList.push({'title': title, 'year': year, 'detailUrl': detailUrl});
						}
					})
				})
				// Return with the winner list
				resolve(winnerList);
			}
		})
	})
)

// Get request to grab Detail URL data
const detailUrlRequest = (detailUrl) => (
	new Promise((resolve, reject) => {
		request.get({
			method: 'GET',
			url: detailUrl
		}, (err, results) => {
			if (err) {
				reject(err);
			} else {
				// Return full object which includes the budget
				resolve(results);
			}
		})
	})
)

// Function for cleaning up inconsistent budget entries
const budgetScrubber = (item) => {
  if (item !== undefined) {
      // Remove the unncecessary brackets
      item = item.replace(/ *\[[^)]*\] */g, "")
      // Remove 'US' and 'USD' (only two cases currently)
      item = item.replace(/US\$ |US\$|US|USD\$ \$/g,'$');
      // Declare number variable which will be mutated
      let number;

      // Case One: budget is in written actual number form
      if (item.search('million') === -1) {
          // Currency type in all current cases is at position 0
          const currency = item[0];
          // Parse out just the number and leave in string form
          number = item.slice(1, item.length).split(' ')[0]
          // Convert to Number type
          number = Number(number.replace(/,/g, ''));
          // Edge case: if currency was in British Pounds
          if (currency === '£') {
              // Using a historical average estimate
              // I would improve this accuracy by using another API to grab exchange rate for that year
              number *= 1.7;
          }
      
      // Case Two: budget is in english form with 'million'
      } else if (item.search('million') !== -1) {
          // Currency type in all current cases is at position 0
          const currency = item[0];
          // Remove everything but the number estimate
          // I'm also choosing the USD number if two are given (rationale: exchange rate fluctuations)
          number = item.slice(1, item.length).replace(/million/g, '').split(' ')[0]
          // Account for ranges by taking the midpoint
          if (number.search('–') !== -1 || number.search('-') !== -1) {
              // Range has been found so I'm calculating the midpoint
              // Make the dash type consistent before splitting into two numbers (to avoid errors)
              number = number.replace(/–|-/g, '-');
              number = number.split('-');
              // Replace number with average of the two numbers
              number = (Number(number[0]) + Number(number[1])) / 2;
              // Convert the midpoint to a million figure
              number *= 1000000;
          // For cases where a '-' range wasn't given
          } else {
              // Convert string to million
              number = Number(number) * 1000000;
		          // Account for British Pound conversion
		          if (currency === '£') {
		            // Using a historical average estimate
		            // I would improve this accuracy by using another API to grab exchange rate for that year
		            number *= 1.7;
		          }
          }

      }
      // Round all numbers to nearest integer before returning
      number = Math.round(number);
      return number;
  }

}

// This function logs the year, title and budget for each winner and the average budget
const logWinners = (winnerList) => {
	// Declare a cache object to tally the budget total and number of films
	// This will later be used to show the average budget when our recursive helper function is finished
	let budgetObj = {
		aggregateSum: 0,
		numberOfFilms: 0
	}
	// This helper function iterates asynchronously through each winner in the list
	const recursiveHelper = (list) => {
		// Recursive base case:
		// Print the average budget when we have finished iterating through every winner in the list
		if (list.length === 0) {
			console.log(`Average budget: $${Math.round(budgetObj.aggregateSum / budgetObj.numberOfFilms).toLocaleString()}`)
		}
		
		// Use the detailUrlRequest promise function to get the budget data
		detailUrlRequest(list[0].detailUrl).then((data) => {
			// Parse JSON data returned by the GET request
			let budget = JSON.parse(data.body).Budget;
			// Scrub the budget data
			budget = budgetScrubber(budget);
			// If budget is not undefined
			if (budget !== undefined) {
				// Add budget to the winners' aggregated total
				budgetObj.aggregateSum += budget;
				// Increment the number of winners by 1
				budgetObj.numberOfFilms++;
				// Change the budget to be human readable in currency form
				budget = `$${Math.round(budget).toLocaleString()}`;
			} else {
				// Change budget from undefined to N/A
				budget = 'N/A'
			}

			// Log the year, title and budget
			console.log(`Year: ${list[0].year}, Title: ${list[0].title}, Budget: ${budget}`);
			
			// Recursive case: call the recursive helper to continue iterating through the list
			recursiveHelper(list.slice(1));
		})		
	}

	// Kick off the recursive helper function
	recursiveHelper(winnerList);
}

// Step 1: Request the list of winners, then execute the logWinners function
getWinnerList().then((list) => {
	// Step 2: execute the function to log all winner data and end with the average budget
	logWinners(list);
});

