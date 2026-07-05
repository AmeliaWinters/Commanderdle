/** Shown in place of the live daily when the device clock is set ahead of real time. */
export default function ClockAheadNotice() {
  return (
    <div className="clock-notice" role="alert">
      <div className="clock-notice-icon" aria-hidden="true"></div>
      <h2>Your clock is running ahead</h2>
      <p>
        Your device's date looks set into the future, so today's
        puzzle isn't available yet. Everyone plays the same commander on
        the same day. Set your clock back to the correct date to play.
      </p>
      <p className="clock-notice-sub">
        The Archive is still open if you'd like to replay past puzzles.
      </p>
    </div>
  );
}
