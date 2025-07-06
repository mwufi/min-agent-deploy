
# Purpose

The purpose of this browser extension is serve high-quality events to our GENESIS AI system, and to allow our GENESIS AI system to act "in the browser" to help the user do tasks.

to do this, we must have two things:
1) an ObservationBus that will send things off to our AI system (right now, let's leave it blank, but define an interface for it)
 
 const logger = ObservationBus()
 logger.info('clicks', clickData)
 logger.info('userMessage', userMessage)

2) an ActionBus that receives events from some source (SSE/websockets), and executes them

 const a = ActionBus("/events/")
 a.onEvent("displayMessage", mesage => {...})

(use your senior staff engineering skills to even improve upon this interface)

# User Interface

We want to show a main persistent bottom bar (similar to bottom-bar.png) on webpages that the extension recognizes (for now, it's mostly just Gmail).

BottomPanel (for displaying chat content)
BottomBar

Design it well, make it beautiful & translucent!

There's also a little "x" button to hide the bottom bar, which will hide it until you press the browser extension icon again

# Gmail Helpers

For gmail in particular, we want to load https://www.npmjs.com/package/gmail-js to help us understand the current user state & actions on Gmail.

At all times, we want to maintain a GmailContext class that will store things like:
- the user's last 15 actions (opening a mail, archiving a mail, navigating to home, etc).
- if current mail is focused, the contents of the mail, the email addresses & names involved (if possible)
- If multiple mails are selected, the selection (threadIds/messageIds are fine)

Now, we want this data to actually stay IN BROWSER, because mail is pretty private! So the best solution is actually in-memory. You can just console log it to see that we have it