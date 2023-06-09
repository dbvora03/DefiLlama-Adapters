const ADDRESSES = require('../helper/coreAssets.json')
const { GraphQLClient, gql } = require('graphql-request')
const sdk = require('@defillama/sdk');
const axios = require("axios");

const config = {
  GRAPH_URL: "https://api.studio.thegraph.com/query/41778/etherfi-mainnet/0.0.3",
  BEACONCHAIN_URL: "https://beaconcha.in/api/v1/validator",
};

const calculateTVL = async (block) => {

  console.time('label')
  const { validators } = await queryFromDepositEvent()
  const listOfNodeAddresses = validators.map(validator => validator.etherfiNode)
  const arrayOfPubKeys = validators.map(validator => validator.validatorPubKey)

  const response = await axios.post(config.BEACONCHAIN_URL, {
    indicesOrPubkey: arrayOfPubKeys.join(",")
  })

  let validatorTVL = 0
  // Iterate through all validators and add to mapping
  response.data.data.forEach(validator => {
    validatorTVL += validator.balance * 1000000000
  });

  const {output} = await sdk.api.eth.getBalances({ targets: listOfNodeAddresses, block })

  let nodeTVL = 0;
  output.forEach(node => {
    nodeTVL += parseInt(node.balance)
  })

  console.timeEnd('label')
  return nodeTVL + validatorTVL
}

const queryFromDepositEvent = async () => {

  var graphQLClient = new GraphQLClient(config.GRAPH_URL)
  const validatorQuery = gql`
      {
          validators {
              etherfiNode
              TNFTHolder
              validatorPubKey
          }
      }`
  try {
      const res = await graphQLClient.request(validatorQuery)
      return res
  } catch (error) {
      console.error('error: queryFromDepositEvent:', error)
  }
}

module.exports = {
  misrepresentedTokens: true,
  ethereum: {
    tvl: async (_, block, _2, { api }) => {
      return {
        ['ethereum:' + ADDRESSES.null]: await calculateTVL(block)
      }
    }
  }
}