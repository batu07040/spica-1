import {INestApplication} from "@nestjs/common";
import {SchemaModule, Default, Format} from "@spica-server/core/schema";
import {ObjectId, DatabaseService} from "@spica-server/database";
import {Test, TestingModule} from "@nestjs/testing";
import {CoreTestingModule, Request} from "@spica-server/core/testing";
import {PassportTestingModule} from "@spica-server/passport/testing";
import {DatabaseTestingModule} from "@spica-server/database/testing";
import {BucketModule, Bucket} from ".";

export const CREATED_AT: Default = {
  keyword: ":created_at",
  type: "date",
  create: data => {
    return data || new Date().toISOString();
  }
};

export const UPDATED_AT: Default = {
  keyword: ":updated_at",
  type: "date",
  create: () => {
    return new Date().toISOString();
  }
};

export const OBJECT_ID: Format = {
  name: "objectid",
  type: "string",
  coerce: bucketId => {
    return new ObjectId(bucketId);
  },
  validate: bucketId => {
    try {
      return !!bucketId && !!new ObjectId(bucketId);
    } catch {
      return false;
    }
  }
};

describe("Bucket acceptance", () => {
  let app: INestApplication;
  let req: Request;
  let module: TestingModule;

  const bucket = {
    _id: new ObjectId(),
    title: "New Bucket",
    description: "Describe your new bucket",
    icon: "view_stream",
    primary: "title",
    readOnly: false,
    properties: {
      title: {
        type: "string",
        title: "title",
        description: "Title of the row",
        options: {position: "left", visible: true}
      },
      description: {
        type: "textarea",
        title: "description",
        description: "Description of the row",
        options: {position: "right"}
      }
    }
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        SchemaModule.forRoot({
          formats: [OBJECT_ID],
          defaults: [CREATED_AT, UPDATED_AT]
        }),
        CoreTestingModule,
        PassportTestingModule.initialize(),
        DatabaseTestingModule.replicaSet(),
        BucketModule
      ]
    }).compile();
    app = module.createNestApplication();
    req = module.get(Request);
    await app.listen(req.socket);
  }, 120000);

  afterEach(async () => {
    await module
      .get(DatabaseService)
      .collection("buckets")
      .deleteMany({})
      .catch(error => console.log(error));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("get requests", () => {
    it("should get predefinedDefaults", async () => {
      const response = await req.get("/bucket/predefs", {});
      expect([response.statusCode, response.statusText]).toEqual([200, "OK"]);

      const defaults = response.body;
      expect(defaults.length).toBe(2);
      expect(defaults).toEqual([
        {keyword: ":created_at", type: "date"},
        {keyword: ":updated_at", type: "date"}
      ]);
    });

    it("should get spesific bucket", async () => {
      //add bucket
      await req.post("/bucket", bucket);

      //get bucket
      const response = await req.get(`/bucket/${bucket._id}`, {});
      expect([response.statusCode, response.statusText]).toEqual([200, "OK"]);
      expect(response.body).toEqual({
        _id: bucket._id.toHexString(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          description: {
            type: "textarea",
            title: "description",
            description: "Description of the row",
            options: {position: "right"}
          }
        }
      });
    });

    it("should get all buckets", async () => {
      //add buckets
      const firstBucket = {
        _id: new ObjectId(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          description: {
            type: "string",
            title: "description",
            description: "Description of the row",
            options: {position: "right", visible: true}
          }
        }
      };
      const secondBucket = {
        _id: new ObjectId(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          name: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          age: {
            type: "number",
            title: "Age",
            description: "Age of the row",
            options: {position: "right", visible: true}
          }
        }
      };
      await req.post("/bucket", firstBucket);
      await req.post("/bucket", secondBucket);

      const response = await req.get("/bucket", {});
      expect([response.statusCode, response.statusText]).toEqual([200, "OK"]);

      const buckets = response.body;
      expect(buckets.length).toBe(2);
      expect(buckets).toEqual([
        {
          _id: firstBucket._id.toHexString(),
          title: "New Bucket",
          description: "Describe your new bucket",
          icon: "view_stream",
          primary: "title",
          readOnly: false,
          properties: {
            title: {
              type: "string",
              title: "title",
              description: "Title of the row",
              options: {position: "left", visible: true}
            },
            description: {
              type: "string",
              title: "description",
              description: "Description of the row",
              options: {position: "right", visible: true}
            }
          }
        },
        {
          _id: secondBucket._id.toHexString(),
          title: "New Bucket",
          description: "Describe your new bucket",
          icon: "view_stream",
          primary: "title",
          readOnly: false,
          properties: {
            name: {
              type: "string",
              title: "title",
              description: "Title of the row",
              options: {position: "left", visible: true}
            },
            age: {
              type: "number",
              title: "Age",
              description: "Age of the row",
              options: {position: "right", visible: true}
            }
          }
        }
      ]);
    });
  });

  describe("add/update requests", () => {
    it("should add new bucket and return it", async () => {
      const response = await req.post("/bucket", bucket);
      expect([response.statusCode, response.statusText]).toEqual([201, "Created"]);
      expect(response.body).toEqual({
        _id: bucket._id.toHexString(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          description: {
            type: "textarea",
            title: "description",
            description: "Description of the row",
            options: {position: "right"}
          }
        }
      });

      //get buckets to check updates
      const buckets = (await req.get("/bucket", {})).body;
      expect(buckets.length).toBe(1);
      expect(buckets[0]).toEqual({
        _id: bucket._id.toHexString(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          description: {
            type: "textarea",
            title: "description",
            description: "Description of the row",
            options: {position: "right"}
          }
        }
      });
    });

    it("should update single bucket", async () => {
      // add bucket
      let updatedBucket = (await req.post("/bucket", bucket)).body;

      //update bucket
      updatedBucket = {
        _id: bucket._id,
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "description",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left"}
          },
          description: {
            type: "string",
            title: "description",
            description: "Description of the row",
            options: {position: "left", visible: true}
          },
          age: {
            type: "number",
            title: "age",
            description: "Age of the row",
            options: {position: "right", visible: true}
          }
        }
      };

      const response = await req.post("/bucket", updatedBucket);
      expect([response.statusCode, response.statusText]).toEqual([201, "Created"]);
      expect(response.body).toEqual({
        _id: bucket._id.toHexString(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "description",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left"}
          },
          description: {
            type: "string",
            title: "description",
            description: "Description of the row",
            options: {position: "left", visible: true}
          },
          age: {
            type: "number",
            title: "age",
            description: "Age of the row",
            options: {position: "right", visible: true}
          }
        }
      });

      //get buckets to check updates
      const buckets = (await req.get("/bucket", {})).body;
      expect(buckets.length).toBe(1);
      expect(buckets[0]).toEqual({
        _id: bucket._id.toHexString(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "description",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left"}
          },
          description: {
            type: "string",
            title: "description",
            description: "Description of the row",
            options: {position: "left", visible: true}
          },
          age: {
            type: "number",
            title: "age",
            description: "Age of the row",
            options: {position: "right", visible: true}
          }
        }
      });
    });

    it("should update bucket indexes", async () => {
      //add buckets
      let firstBucket: any = {
        _id: new ObjectId(),
        title: "First Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          description: {
            type: "string",
            title: "description",
            description: "Description of the row",
            options: {position: "right", visible: true}
          }
        }
      };
      let secondBucket = {...firstBucket, _id: new ObjectId(), title: "Second Bucket"};
      let thirdBucket = {...firstBucket, _id: new ObjectId(), title: "Third Bucket"};

      await req.post("/bucket", firstBucket);
      await req.post("/bucket", secondBucket);
      await req.post("/bucket", thirdBucket);

      //update their indexes
      await req.put("/bucket", [
        {...firstBucket, order: 3},
        {...secondBucket, order: 1},
        {...thirdBucket, order: 2}
      ]);

      const buckets = (await req.get("/bucket", {})).body;

      expect(buckets.map(bucket => bucket.title)).toEqual([
        "Second Bucket",
        "Third Bucket",
        "First Bucket"
      ]);
    });
  });

  describe("delete requests", () => {
    it("should delete spesific bucket", async () => {
      const deletedBucketId = new ObjectId();
      //add buckets
      await req.post("/bucket", bucket);
      await req.post("/bucket", {...bucket, _id: deletedBucketId});

      const response = await req.delete(`/bucket/${deletedBucketId}`);
      expect([response.statusCode, response.statusText]).toEqual([204, "No Content"]);

      const buckets = (await req.get("/bucket", {})).body;
      expect(buckets.length).toBe(1);
      expect(buckets[0]).toEqual({
        _id: bucket._id.toHexString(),
        title: "New Bucket",
        description: "Describe your new bucket",
        icon: "view_stream",
        primary: "title",
        readOnly: false,
        properties: {
          title: {
            type: "string",
            title: "title",
            description: "Title of the row",
            options: {position: "left", visible: true}
          },
          description: {
            type: "textarea",
            title: "description",
            description: "Description of the row",
            options: {position: "right"}
          }
        }
      });
    });
  });

  describe("validation", () => {
    const validBucket: any = {
      _id: new ObjectId(),
      title: "New Bucket",
      description: "Describe your new bucket",
      icon: "view_stream",
      primary: "title",
      readOnly: false,
      properties: {
        title: {
          type: "string",
          title: "title",
          description: "Title of the row",
          options: {position: "left", visible: true}
        },
        description: {
          type: "textarea",
          title: "description",
          description: "Description of the row",
          options: {position: "right"}
        }
      }
    };

    it("should show error about id type", async () => {
      const invalidBucket = {...bucket, _id: "invalid id type"};
      const response = await req.post("/bucket", invalidBucket);
      expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
      expect([response.body.error, response.body.message]).toEqual([
        "._id should match format 'objectid'",
        "validation failed"
      ]);
    });

    describe("title", () => {
      it("should show error about minLength ", async () => {
        const invalidBucket = {...validBucket, title: "asd"};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".title should NOT be shorter than 4 characters",
          "validation failed"
        ]);
      });

      it("should show error about maxLength ", async () => {
        const invalidBucket = {...validBucket, title: "a".repeat(101)};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".title should NOT be longer than 100 characters",
          "validation failed"
        ]);
      });
    });

    describe("description", () => {
      it("should show error about minlength ", async () => {
        const invalidBucket = {...validBucket, description: "asde"};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".description should NOT be shorter than 5 characters",
          "validation failed"
        ]);
      });

      it("should show error about maxLength ", async () => {
        const invalidBucket = {...validBucket, description: "a".repeat(251)};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".description should NOT be longer than 250 characters",
          "validation failed"
        ]);
      });
    });

    describe("icon", () => {
      it("should show error about type", async () => {
        const invalidBucket = {...validBucket, icon: 333};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".icon should be string",
          "validation failed"
        ]);
      });

      it("should set 'view_stream' as default value", async () => {
        let newBucket = {...validBucket};
        delete newBucket.icon;
        const response = await req.post("/bucket", newBucket);
        expect([response.statusCode, response.statusText]).toEqual([201, "Created"]);
        expect(response.body.icon).toEqual("view_stream");
      });
    });

    it("should show error about primary type", async () => {
      const invalidBucket = {...validBucket, primary: []};
      const response = await req.post("/bucket", invalidBucket);
      expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
      expect([response.body.error, response.body.message]).toEqual([
        ".primary should be string",
        "validation failed"
      ]);
    });

    it("should show error about order type", async () => {
      const invalidBucket = {...validBucket, order: "1"};
      const response = await req.post("/bucket", invalidBucket);
      expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
      expect([response.body.error, response.body.message]).toEqual([
        ".order should be number",
        "validation failed"
      ]);
    });

    describe("required", () => {
      it("should show error about type", async () => {
        const invalidBucket = {...validBucket, required: {asd: "qwe"}};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".required should be array",
          "validation failed"
        ]);
      });

      it("should show error about array items type", async () => {
        const invalidBucket = {...validBucket, required: ["asd", 1]};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".required[1] should be string",
          "validation failed"
        ]);
      });

      it("should show error when array items arent unique ", async () => {
        const invalidBucket = {...validBucket, required: ["asd", "asd", "qwe", "zxc"]};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".required should NOT have duplicate items (items ## 1 and 0 are identical)",
          "validation failed"
        ]);
      });
    });

    it("should show error about readonly type", async () => {
      const invalidBucket = {...validBucket, readOnly: "true"};
      const response = await req.post("/bucket", invalidBucket);
      expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
      expect([response.body.error, response.body.message]).toEqual([
        ".readOnly should be boolean",
        "validation failed"
      ]);
    });

    describe("properties", () => {
      it("should show error about type", async () => {
        const invalidBucket = {...validBucket, properties: 1};
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties should be object",
          "validation failed"
        ]);
      });

      it("should show error about title type", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.type = 333;
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].type should be string",
          "validation failed"
        ]);
      });

      it("should show error about title type which isnt available", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.type = "hashmap";
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].type should be equal to one of the allowed values",
          "validation failed"
        ]);
      });

      it("should show error about title title", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.title = 333;
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].title should be string",
          "validation failed"
        ]);
      });

      it("should show error about title description", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.description = ["asdqwe", "ahsgdasd"];
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].description should be string",
          "validation failed"
        ]);
      });

      it("should show error about title options type", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.options = "asd";
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].options should be object",
          "validation failed"
        ]);
      });

      it("should show error about title visible type", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.options.visible = "asd";
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].options.visible should be boolean",
          "validation failed"
        ]);
      });

      it("should show error about title translate type", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.options.translate = 33;
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].options.translate should be boolean",
          "validation failed"
        ]);
      });

      it("should show error about title history type", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.options.history = "false";
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].options.history should be boolean",
          "validation failed"
        ]);
      });

      it("should show error about title position type", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.options.position = ["bottom,left"];
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].options.position should be string",
          "validation failed"
        ]);
      });

      it("should show error about title position value which isn't available", async () => {
        const invalidBucket = JSON.parse(JSON.stringify(validBucket));
        invalidBucket.properties.title.options.position = "top";
        const response = await req.post("/bucket", invalidBucket);
        expect([response.statusCode, response.statusText]).toEqual([400, "Bad Request"]);
        expect([response.body.error, response.body.message]).toEqual([
          ".properties['title'].options.position should be equal to one of the allowed values",
          "validation failed"
        ]);
      });
    });
  });
});
