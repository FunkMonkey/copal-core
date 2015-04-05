export default {
  name: "Example",

  initialData: {},

  preferredInputs: [],

  preferredOutputs: [],

  signals: {
    "input": {
      "standard-query-input": ["Example.getResults"]
    },
    "output": {
      "list-title-url-icon": ["Example.toURLList"]
    },
    "listitem-execute": {
      "listitem-title-url-icon": ["Example.itemToUrl", "Common.open"]
    }
  }
};
