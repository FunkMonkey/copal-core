export default [
  {
    "name": "commands",
    "description": "Shows a list of available commands",

    "query": {},

    "preferredInputs": [],
    "preferredOutputs": [],

    "signals": {
      "input": {
        "standard-query-input": ["CoPal.getCommandInfos"]
      },
      "output": {
        "list-title-url-icon": []
      },
      "listitem-execute": {
        "listitem-title-url-icon": ["CoPal.executeCommand"]
      }
    }
  }
];
