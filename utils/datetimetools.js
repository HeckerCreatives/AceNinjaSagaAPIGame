exports.DateTimeServer = () => {
    const date = new Date();
    
    // Get the Unix timestamp in milliseconds
    const unixTimeMilliseconds = date.getTime();
        
    // Convert it to Unix timestamp in seconds
    const unixTimeSeconds = Math.floor(unixTimeMilliseconds / 1000);
    
    return unixTimeSeconds;
}

exports.RemainingTime = (startTime, claimDays) => {
    //  FOR TESTING PURPOSES
    // Convert the start time from Unix time (seconds) to milliseconds
    // const startTimeMilliseconds = parseFloat(startTime) * 1000;

    // // Convert claimDays to milliseconds, but scale 1 day to 1 minute for testing
    // const claimDaysMilliseconds = parseFloat(claimDays) * 60 * 1000;

    // // Calculate the target time by adding the claimDays to the startTime
    // const targetTimeMilliseconds = startTimeMilliseconds + claimDaysMilliseconds;

    // // Get the current time in milliseconds
    // const currentTimeMilliseconds = Date.now();

    // // Calculate the remaining time by subtracting the current time from the target time
    // const remainingTimeMilliseconds = targetTimeMilliseconds - currentTimeMilliseconds;

    // // If the remaining time is less than 0, it means the target time has passed
    // if (remainingTimeMilliseconds < 0) {
    //     return 0;
    // }

    // // Convert the remaining time to Unix timestamp in seconds
    // const remainingTimeSeconds = Math.floor(remainingTimeMilliseconds / 1000);

    // return remainingTimeSeconds;

    // Convert the start time from Unix time (seconds) to milliseconds
    const startTimeMilliseconds = parseFloat(startTime) * 1000;

    // Convert claimDays to milliseconds
    const claimDaysMilliseconds = parseFloat(claimDays) * 24 * 60 * 60 * 1000;

    // Calculate the target time by adding the claimDays to the startTime
    const targetTimeMilliseconds = startTimeMilliseconds + claimDaysMilliseconds;

    // Get the current time in milliseconds
    const currentTimeMilliseconds = Date.now();

    // Calculate the remaining time by subtracting the current time from the target time
    const remainingTimeMilliseconds = targetTimeMilliseconds - currentTimeMilliseconds;

    // If the remaining time is less than 0, it means the target time has passed
    if (remainingTimeMilliseconds < 0) {
        return 0;
    }

    // Convert the remaining time to Unix timestamp in seconds
    const remainingTimeSeconds = Math.floor(remainingTimeMilliseconds / 1000);

    return remainingTimeSeconds;
}


exports.getSeasonRemainingTimeInMilliseconds = (createdAt, durationInDays) => {
    if (!createdAt || !durationInDays) return 0;

    // Convert createdAt to a timestamp (milliseconds)
    const startTimeMilliseconds = new Date(createdAt).getTime();

    // Convert duration (days) to milliseconds
    const durationMilliseconds = Number(durationInDays) * 24 * 60 * 60 * 1000;

    // Calculate the target end time
    const endTimeMilliseconds = startTimeMilliseconds + durationMilliseconds;

    // Get the current time in milliseconds
    const currentTimeMilliseconds = Date.now();

    // Calculate the remaining time
    const remainingTimeMilliseconds = endTimeMilliseconds - currentTimeMilliseconds;

    // If the remaining time is negative (season expired), return 0
    return remainingTimeMilliseconds > 0 ? remainingTimeMilliseconds : 0;
};

