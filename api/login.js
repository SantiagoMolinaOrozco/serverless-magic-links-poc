const crypto = require('crypto')
const AWS = require('aws-sdk')
const cognito = new AWS.CognitoIdentityServiceProvider()
const ses = new AWS.SES({ region: 'us-east-1' })

module.exports.handler = async (event) => {
  try {
    const { email, redirect } = JSON.parse(event.body)

    const authChallenge = crypto.randomBytes(5).toString('hex')

    await cognito.adminUpdateUserAttributes({
      UserAttributes: [
        {
          Name: 'custom:authChallenge',
          Value: `${authChallenge},${Math.round((new Date()).valueOf() / 1000)}`
        }
      ],
      UserPoolId: process.env.USER_POOL_ID,
      Username: email
    }).promise()

    const url = `${redirect || 'http://localhost:3000'}?challenge=${email},${authChallenge}`

    const msg = 'Your link is ' + url

    const params = {
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Body: {
          Text: { Data: msg }
        },
        Subject: { Data: 'Nice work!' }
      },
      Source: '$SENDEREMAIL'
    }
    await ses.sendEmail(params).promise()
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: 'Login successful'
      })
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Sorry, we could not find your account.',
        errorDetail: error.message
      })
    }
  }
}
