// BuildPlan Pro default sample project data.
// Generated from BuildPlan_Pro_20260523.json for first-run startup only.
window.BuildPlanDefaultProjectData = {
  "version": "2.0",
  "savedAt": "2026-05-23T23:47:35.609Z",
  "app": "BuildPlan Pro",
  "appVersion": "structured-phase-24",
  "info": {
    "name": "โครงการก่อสร้างอาคารสร้างดีมีสุข",
    "owner": "บริษัท ตั้งใจทำ จำกัด",
    "location": "99 หมู่ 9 ตำบลบ้านใหม่ อำเภอเมืองดี จังหวัดสุขใจ",
    "contractor": "หจก. ดีใจการช่าง",
    "contractNo": "TDM-001/69",
    "value": "25,746,727.50",
    "supervisor": "นายสมชาย งานไว"
  },
  "prefs": {
    "userScalePreference": "auto",
    "ganttBarStyleMode": "classic",
    "sCurveFrequency": "weekly",
    "sCurveFillVisible": false,
    "sCurveSmoothMode": false,
    "isSignatureVisible": false,
    "showInstallmentLines": false,
    "taskNameColumnWidth": 233,
    "durationTaskNameColumnWidth": 214,
    "actualTaskNameColumnWidth": 320
  },
  "installmentSettings": {
    "count": 0,
    "durationDays": 30,
    "durations": []
  },
  "durationPlanSettings": {},
  "actualSettings": {
    "frequency": "weekly"
  },
  "actualEntries": {
    "2026-05-23": {},
    "2026-06-01": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 100,
      "6": 30
    },
    "2026-05-01": {},
    "2026-04-01": {
      "1": 10
    },
    "2026-04-08": {
      "1": 70
    },
    "2026-04-15": {
      "1": 100,
      "2": 30
    },
    "2026-04-22": {
      "1": 100,
      "2": 80
    },
    "2026-04-29": {
      "1": 100,
      "2": 90
    },
    "2026-05-06": {
      "1": 100,
      "2": 100,
      "3": 50
    },
    "2026-05-13": {
      "1": 100,
      "2": 100,
      "3": 80
    },
    "2026-05-20": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 30
    },
    "2026-05-27": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 60
    },
    "2026-06-03": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 100,
      "6": 50
    },
    "2026-06-10": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 100,
      "6": 70
    },
    "2026-06-17": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 100,
      "6": 90
    },
    "2026-06-24": {
      "1": 100,
      "2": 100,
      "3": 100,
      "5": 100,
      "6": 100,
      "7": 10
    },
    "2026-07-01": {}
  },
  "costSettings": {
    "factorF": 1,
    "vat": 1.07
  },
  "tasks": [
    {
      "id": 4,
      "name": "งานเตรียมการและงานชั่วคราว",
      "duration": 35,
      "start": "2026-04-01",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "1",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2026-03-31T17:00:00.000Z",
      "startDateObj": "2026-03-31T17:00:00.000Z",
      "endDateObj": "2026-05-04T17:00:00.000Z"
    },
    {
      "id": 1,
      "name": "งานเตรียมพื้นที่ก่อสร้างและป้ายโครงการ",
      "duration": 10,
      "start": "2026-04-01",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "",
      "cost": 150000,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "1.1",
      "isCritical": true,
      "progress": 100,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2026-03-31T17:00:00.000Z",
      "startDateObj": "2026-03-31T17:00:00.000Z",
      "endDateObj": "2026-04-09T17:00:00.000Z"
    },
    {
      "id": 2,
      "name": "งานสำรวจ วางผัง และกำหนดแนวอาคาร",
      "duration": 10,
      "start": "2026-04-11",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "1.1fs",
      "cost": 120000,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "1.2",
      "isCritical": true,
      "progress": 100,
      "predecessorsStr": "1.1fs",
      "preds": [
        {
          "wbs": "1.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-04-10T17:00:00.000Z",
      "startDateObj": "2026-04-10T17:00:00.000Z",
      "endDateObj": "2026-04-19T17:00:00.000Z"
    },
    {
      "id": 3,
      "name": "งานสำนักงานสนาม รั้วชั่วคราว และสาธารณูปโภคชั่วคราว",
      "duration": 15,
      "start": "2026-04-21",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "1.2fs",
      "cost": 320000,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "1.3",
      "isCritical": true,
      "progress": 100,
      "predecessorsStr": "1.2fs",
      "preds": [
        {
          "wbs": "1.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-04-20T17:00:00.000Z",
      "startDateObj": "2026-04-20T17:00:00.000Z",
      "endDateObj": "2026-05-04T17:00:00.000Z"
    },
    {
      "id": 12,
      "name": "งานฐานรากและโครงสร้าง",
      "duration": 190,
      "start": "2026-05-06",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2026-05-05T17:00:00.000Z",
      "startDateObj": "2026-05-05T17:00:00.000Z",
      "endDateObj": "2026-11-10T17:00:00.000Z"
    },
    {
      "id": 5,
      "name": "งานขุดดินและปรับระดับพื้นที่",
      "duration": 20,
      "start": "2026-05-06",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "1.3fs",
      "cost": 480000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.1",
      "isCritical": true,
      "progress": 30,
      "predecessorsStr": "1.3fs",
      "preds": [
        {
          "wbs": "1.3",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-05-05T17:00:00.000Z",
      "startDateObj": "2026-05-05T17:00:00.000Z",
      "endDateObj": "2026-05-24T17:00:00.000Z"
    },
    {
      "id": 6,
      "name": "งานเสาเข็มและทดสอบเสาเข็ม",
      "duration": 30,
      "start": "2026-05-26",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.1fs",
      "cost": 1850000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.2",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.1fs",
      "preds": [
        {
          "wbs": "2.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-05-25T17:00:00.000Z",
      "startDateObj": "2026-05-25T17:00:00.000Z",
      "endDateObj": "2026-06-23T17:00:00.000Z"
    },
    {
      "id": 7,
      "name": "งานฐานราก ตอม่อ และคานคอดิน",
      "duration": 30,
      "start": "2026-06-25",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.2fs",
      "cost": 1650000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.3",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.2fs",
      "preds": [
        {
          "wbs": "2.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-06-24T17:00:00.000Z",
      "startDateObj": "2026-06-24T17:00:00.000Z",
      "endDateObj": "2026-07-23T17:00:00.000Z"
    },
    {
      "id": 8,
      "name": "งานพื้นชั้นล่าง คสล. และคานพื้น",
      "duration": 30,
      "start": "2026-07-25",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.3fs",
      "cost": 980000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.4",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.3fs",
      "preds": [
        {
          "wbs": "2.3",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-07-24T17:00:00.000Z",
      "startDateObj": "2026-07-24T17:00:00.000Z",
      "endDateObj": "2026-08-22T17:00:00.000Z"
    },
    {
      "id": 9,
      "name": "งานเสา คาน และพื้นโครงสร้างชั้นบน",
      "duration": 30,
      "start": "2026-08-24",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.4fs",
      "cost": 2450000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.5",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.4fs",
      "preds": [
        {
          "wbs": "2.4",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-08-23T17:00:00.000Z",
      "startDateObj": "2026-08-23T17:00:00.000Z",
      "endDateObj": "2026-09-21T17:00:00.000Z"
    },
    {
      "id": 10,
      "name": "งานโครงหลังคาเหล็ก",
      "duration": 30,
      "start": "2026-09-23",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.5fs",
      "cost": 890000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.6",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.5fs",
      "preds": [
        {
          "wbs": "2.5",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-09-22T17:00:00.000Z",
      "startDateObj": "2026-09-22T17:00:00.000Z",
      "endDateObj": "2026-10-21T17:00:00.000Z"
    },
    {
      "id": 11,
      "name": "งานมุงหลังคาและอุปกรณ์ประกอบ",
      "duration": 20,
      "start": "2026-10-23",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.6fs",
      "cost": 760000,
      "colorTheme": {
        "main": "#065f46",
        "sub": "#10b981"
      },
      "wbs": "2.7",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.6fs",
      "preds": [
        {
          "wbs": "2.6",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-10-22T17:00:00.000Z",
      "startDateObj": "2026-10-22T17:00:00.000Z",
      "endDateObj": "2026-11-10T17:00:00.000Z"
    },
    {
      "id": 20,
      "name": "งานสถาปัตยกรรม",
      "duration": 190,
      "start": "2026-11-12",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2026-11-11T17:00:00.000Z",
      "startDateObj": "2026-11-11T17:00:00.000Z",
      "endDateObj": "2027-05-19T17:00:00.000Z"
    },
    {
      "id": 13,
      "name": "งานก่อผนังและผนังเบา",
      "duration": 30,
      "start": "2026-11-12",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "2.7fs",
      "cost": 740000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.1",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "2.7fs",
      "preds": [
        {
          "wbs": "2.7",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-11-11T17:00:00.000Z",
      "startDateObj": "2026-11-11T17:00:00.000Z",
      "endDateObj": "2026-12-10T17:00:00.000Z"
    },
    {
      "id": 14,
      "name": "งานฉาบผนังและปรับผิว",
      "duration": 30,
      "start": "2026-12-12",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.1fs",
      "cost": 520000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.2",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.1fs",
      "preds": [
        {
          "wbs": "3.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-12-11T17:00:00.000Z",
      "startDateObj": "2026-12-11T17:00:00.000Z",
      "endDateObj": "2027-01-09T17:00:00.000Z"
    },
    {
      "id": 15,
      "name": "งานวงกบ ประตู หน้าต่าง และกระจก",
      "duration": 30,
      "start": "2027-01-11",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.2fs",
      "cost": 680000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.3",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.2fs",
      "preds": [
        {
          "wbs": "3.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-10T17:00:00.000Z",
      "startDateObj": "2027-01-10T17:00:00.000Z",
      "endDateObj": "2027-02-08T17:00:00.000Z"
    },
    {
      "id": 16,
      "name": "งานฝ้าเพดาน",
      "duration": 30,
      "start": "2027-02-10",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.3fs",
      "cost": 540000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.4",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.3fs",
      "preds": [
        {
          "wbs": "3.3",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-02-09T17:00:00.000Z",
      "startDateObj": "2027-02-09T17:00:00.000Z",
      "endDateObj": "2027-03-10T17:00:00.000Z"
    },
    {
      "id": 17,
      "name": "งานปูกระเบื้อง พื้น และผนังตกแต่ง",
      "duration": 20,
      "start": "2027-03-12",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.4fs",
      "cost": 960000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.5",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.4fs",
      "preds": [
        {
          "wbs": "3.4",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-03-11T17:00:00.000Z",
      "startDateObj": "2027-03-11T17:00:00.000Z",
      "endDateObj": "2027-03-30T17:00:00.000Z"
    },
    {
      "id": 18,
      "name": "งานทาสีและเก็บผิวงาน",
      "duration": 20,
      "start": "2027-04-01",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.5fs",
      "cost": 430000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.6",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.5fs",
      "preds": [
        {
          "wbs": "3.5",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-03-31T17:00:00.000Z",
      "startDateObj": "2027-03-31T17:00:00.000Z",
      "endDateObj": "2027-04-19T17:00:00.000Z"
    },
    {
      "id": 19,
      "name": "งานภูมิทัศน์ ทางเท้า และงานภายนอกอาคาร",
      "duration": 30,
      "start": "2027-04-21",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.6fs",
      "cost": 510000,
      "colorTheme": {
        "main": "#9a3412",
        "sub": "#f97316"
      },
      "wbs": "3.7",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.6fs",
      "preds": [
        {
          "wbs": "3.6",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-04-20T17:00:00.000Z",
      "startDateObj": "2027-04-20T17:00:00.000Z",
      "endDateObj": "2027-05-19T17:00:00.000Z"
    },
    {
      "id": 25,
      "name": "งานระบบไฟฟ้า",
      "duration": 69,
      "start": "2026-12-12",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#4c1d95",
        "sub": "#8b5cf6"
      },
      "wbs": "4",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2026-12-11T17:00:00.000Z",
      "startDateObj": "2026-12-11T17:00:00.000Z",
      "endDateObj": "2027-02-17T17:00:00.000Z"
    },
    {
      "id": 21,
      "name": "งานเดินท่อร้อยสายไฟและรางเคเบิล",
      "duration": 30,
      "start": "2026-12-12",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.1fs",
      "cost": 420000,
      "colorTheme": {
        "main": "#4c1d95",
        "sub": "#8b5cf6"
      },
      "wbs": "4.1",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "3.1fs",
      "preds": [
        {
          "wbs": "3.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-12-11T17:00:00.000Z",
      "startDateObj": "2026-12-11T17:00:00.000Z",
      "endDateObj": "2027-01-09T17:00:00.000Z"
    },
    {
      "id": 22,
      "name": "งานติดตั้งตู้เมน ตู้ย่อย และระบบสายไฟฟ้า",
      "duration": 20,
      "start": "2027-01-11",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "4.1fs",
      "cost": 880000,
      "colorTheme": {
        "main": "#4c1d95",
        "sub": "#8b5cf6"
      },
      "wbs": "4.2",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "4.1fs",
      "preds": [
        {
          "wbs": "4.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-10T17:00:00.000Z",
      "startDateObj": "2027-01-10T17:00:00.000Z",
      "endDateObj": "2027-01-29T17:00:00.000Z"
    },
    {
      "id": 23,
      "name": "งานติดตั้งดวงโคม ปลั๊ก สวิตช์ และระบบแจ้งเหตุเพลิงไหม้",
      "duration": 14,
      "start": "2027-01-31",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "4.2fs",
      "cost": 740000,
      "colorTheme": {
        "main": "#4c1d95",
        "sub": "#8b5cf6"
      },
      "wbs": "4.3",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "4.2fs",
      "preds": [
        {
          "wbs": "4.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-30T17:00:00.000Z",
      "startDateObj": "2027-01-30T17:00:00.000Z",
      "endDateObj": "2027-02-12T17:00:00.000Z"
    },
    {
      "id": 24,
      "name": "งานทดสอบระบบไฟฟ้า",
      "duration": 5,
      "start": "2027-02-14",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "4.3fs",
      "cost": 95000,
      "colorTheme": {
        "main": "#4c1d95",
        "sub": "#8b5cf6"
      },
      "wbs": "4.4",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "4.3fs",
      "preds": [
        {
          "wbs": "4.3",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-02-13T17:00:00.000Z",
      "startDateObj": "2027-02-13T17:00:00.000Z",
      "endDateObj": "2027-02-17T17:00:00.000Z"
    },
    {
      "id": 30,
      "name": "งานระบบประปา-สุขาภิบาล",
      "duration": 49,
      "start": "2026-12-12",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#831843",
        "sub": "#f43f5e"
      },
      "wbs": "5",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2026-12-11T17:00:00.000Z",
      "startDateObj": "2026-12-11T17:00:00.000Z",
      "endDateObj": "2027-01-28T17:00:00.000Z"
    },
    {
      "id": 26,
      "name": "งานท่อประปาภายนอกอาคารและบ่อพัก",
      "duration": 20,
      "start": "2026-12-12",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.1fs",
      "cost": 260000,
      "colorTheme": {
        "main": "#831843",
        "sub": "#f43f5e"
      },
      "wbs": "5.1",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "3.1fs",
      "preds": [
        {
          "wbs": "3.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-12-11T17:00:00.000Z",
      "startDateObj": "2026-12-11T17:00:00.000Z",
      "endDateObj": "2026-12-30T17:00:00.000Z"
    },
    {
      "id": 27,
      "name": "งานเดินท่อประปา-สุขาภิบาลภายในอาคาร",
      "duration": 15,
      "start": "2027-01-01",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "5.1fs",
      "cost": 520000,
      "colorTheme": {
        "main": "#831843",
        "sub": "#f43f5e"
      },
      "wbs": "5.2",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "5.1fs",
      "preds": [
        {
          "wbs": "5.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2026-12-31T17:00:00.000Z",
      "startDateObj": "2026-12-31T17:00:00.000Z",
      "endDateObj": "2027-01-14T17:00:00.000Z"
    },
    {
      "id": 28,
      "name": "งานติดตั้งสุขภัณฑ์ ปั๊มน้ำ และถังเก็บน้ำ",
      "duration": 10,
      "start": "2027-01-16",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "5.2fs",
      "cost": 390000,
      "colorTheme": {
        "main": "#831843",
        "sub": "#f43f5e"
      },
      "wbs": "5.3",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "5.2fs",
      "preds": [
        {
          "wbs": "5.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-15T17:00:00.000Z",
      "startDateObj": "2027-01-15T17:00:00.000Z",
      "endDateObj": "2027-01-24T17:00:00.000Z"
    },
    {
      "id": 29,
      "name": "งานทดสอบระบบประปา-สุขาภิบาล",
      "duration": 4,
      "start": "2027-01-26",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "5.3fs",
      "cost": 65000,
      "colorTheme": {
        "main": "#831843",
        "sub": "#f43f5e"
      },
      "wbs": "5.4",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "5.3fs",
      "preds": [
        {
          "wbs": "5.3",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-25T17:00:00.000Z",
      "startDateObj": "2027-01-25T17:00:00.000Z",
      "endDateObj": "2027-01-28T17:00:00.000Z"
    },
    {
      "id": 34,
      "name": "งานระบบปรับอากาศและระบายอากาศ",
      "duration": 32,
      "start": "2027-01-11",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#1e3a8a",
        "sub": "#6366f1"
      },
      "wbs": "6",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2027-01-10T17:00:00.000Z",
      "startDateObj": "2027-01-10T17:00:00.000Z",
      "endDateObj": "2027-02-10T17:00:00.000Z"
    },
    {
      "id": 31,
      "name": "งานติดตั้งท่อดักท์และอุปกรณ์รองรับ",
      "duration": 14,
      "start": "2027-01-11",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.2fs",
      "cost": 560000,
      "colorTheme": {
        "main": "#1e3a8a",
        "sub": "#6366f1"
      },
      "wbs": "6.1",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "3.2fs",
      "preds": [
        {
          "wbs": "3.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-10T17:00:00.000Z",
      "startDateObj": "2027-01-10T17:00:00.000Z",
      "endDateObj": "2027-01-23T17:00:00.000Z"
    },
    {
      "id": 32,
      "name": "งานติดตั้งครุภัณฑ์พัดลมระบายอากาศและอุปกรณ์ควบคุม",
      "duration": 10,
      "start": "2027-01-25",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "6.1fs",
      "cost": 280000,
      "colorTheme": {
        "main": "#1e3a8a",
        "sub": "#6366f1"
      },
      "wbs": "6.2",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "6.1fs",
      "preds": [
        {
          "wbs": "6.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-01-24T17:00:00.000Z",
      "startDateObj": "2027-01-24T17:00:00.000Z",
      "endDateObj": "2027-02-02T17:00:00.000Z"
    },
    {
      "id": 33,
      "name": "งานเดินท่อน้ำทิ้ง ท่อน้ำยา และระบบควบคุม",
      "duration": 8,
      "start": "2027-02-04",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "6.2fs",
      "cost": 310000,
      "colorTheme": {
        "main": "#1e3a8a",
        "sub": "#6366f1"
      },
      "wbs": "6.3",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "6.2fs",
      "preds": [
        {
          "wbs": "6.2",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-02-03T17:00:00.000Z",
      "startDateObj": "2027-02-03T17:00:00.000Z",
      "endDateObj": "2027-02-10T17:00:00.000Z"
    },
    {
      "id": 37,
      "name": "งานติดตั้งระบบปรับอากาศและระบายอากาศ",
      "duration": 30,
      "start": "2027-02-12",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#14532d",
        "sub": "#22c55e"
      },
      "wbs": "7",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2027-02-11T17:00:00.000Z",
      "startDateObj": "2027-02-11T17:00:00.000Z",
      "endDateObj": "2027-03-12T17:00:00.000Z"
    },
    {
      "id": 35,
      "name": "งานติดตั้งครุภัณฑ์เครื่องปรับอากาศแบบแยกส่วน",
      "duration": 25,
      "start": "2027-02-12",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "6.3fs",
      "cost": 690000,
      "colorTheme": {
        "main": "#14532d",
        "sub": "#22c55e"
      },
      "wbs": "7.1",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "6.3fs",
      "preds": [
        {
          "wbs": "6.3",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-02-11T17:00:00.000Z",
      "startDateObj": "2027-02-11T17:00:00.000Z",
      "endDateObj": "2027-03-07T17:00:00.000Z"
    },
    {
      "id": 36,
      "name": "งานเติมน้ำยา ทดสอบ และปรับสมดุลระบบปรับอากาศ",
      "duration": 5,
      "start": "2027-03-09",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "7.1fs",
      "cost": 110000,
      "colorTheme": {
        "main": "#14532d",
        "sub": "#22c55e"
      },
      "wbs": "7.2",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "7.1fs",
      "preds": [
        {
          "wbs": "7.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-03-08T17:00:00.000Z",
      "startDateObj": "2027-03-08T17:00:00.000Z",
      "endDateObj": "2027-03-12T17:00:00.000Z"
    },
    {
      "id": 41,
      "name": "งานทดสอบระบบ ส่งมอบ และปิดงาน",
      "duration": 35,
      "start": "2027-04-21",
      "isGroup": true,
      "isMilestone": false,
      "predecessors": "",
      "cost": 0,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "8",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "",
      "preds": [],
      "manualStartObj": "2027-04-20T17:00:00.000Z",
      "startDateObj": "2027-04-20T17:00:00.000Z",
      "endDateObj": "2027-05-24T17:00:00.000Z"
    },
    {
      "id": 38,
      "name": "งานทดสอบรวมทุกระบบและ Commissioning",
      "duration": 7,
      "start": "2027-04-21",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.6fs",
      "cost": 180000,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "8.1",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "3.6fs",
      "preds": [
        {
          "wbs": "3.6",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-04-20T17:00:00.000Z",
      "startDateObj": "2027-04-20T17:00:00.000Z",
      "endDateObj": "2027-04-26T17:00:00.000Z"
    },
    {
      "id": 40,
      "name": "งานจัดทำเอกสาร As-Built Drawing และคู่มือระบบ",
      "duration": 5,
      "start": "2027-04-28",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "8.1fs",
      "cost": 125000,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "8.2",
      "isCritical": false,
      "progress": 0,
      "predecessorsStr": "8.1fs",
      "preds": [
        {
          "wbs": "8.1",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-04-27T17:00:00.000Z",
      "startDateObj": "2027-04-27T17:00:00.000Z",
      "endDateObj": "2027-05-01T17:00:00.000Z"
    },
    {
      "id": 39,
      "name": "งานเก็บรายละเอียดและทำความสะอาดใหญ่",
      "duration": 5,
      "start": "2027-05-21",
      "isGroup": false,
      "isMilestone": false,
      "predecessors": "3.7fs",
      "cost": 140000,
      "colorTheme": {
        "main": "#002D62",
        "sub": "#3b82f6"
      },
      "wbs": "8.3",
      "isCritical": true,
      "progress": 0,
      "predecessorsStr": "3.7fs",
      "preds": [
        {
          "wbs": "3.7",
          "type": "FS"
        }
      ],
      "manualStartObj": "2027-05-20T17:00:00.000Z",
      "startDateObj": "2027-05-20T17:00:00.000Z",
      "endDateObj": "2027-05-24T17:00:00.000Z"
    }
  ],
  "schemaVersion": "2.0"
};
