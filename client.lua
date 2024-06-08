local json = require("json")

Handlers.add(
  "DepositBond",
  Handlers.utils.hasMatchingTag("Action", "DepositBond"),
  function (msg)
    local amount = msg.Data.amount
    ao.send({
      Target = ao.id,
      Action = "DepositBondResult",
      Data = json.encode({status = "initiated", amount = amount}),
      Content = "Trigger deposit bond action"
    })
  end
)

Handlers.add(
  "DepositBondResult",
  Handlers.utils.hasMatchingTag("Action", "DepositBondResult"),
  function (msg)
    local msgContent = msg.Data or "No message content"
    print("DepositBondResult: " .. msgContent)
  end
)

Handlers.add(
  "BondingProcessResult",
  Handlers.utils.hasMatchingTag("Action", "BondingProcessResult"),
  function (msg)
    local result = msg.Data or "No result"
    print("Bonding Process Result: " .. result)
  end
)
